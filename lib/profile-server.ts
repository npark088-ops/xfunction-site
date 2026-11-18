import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import { ensureNotification } from "./notifications";
import type { AiUsageResult } from "./ai-usage";
import { AI_LIMITS, USAGE_KIND, currentMonthStart, limitReachedMessage, nextResetAt, type UsageFeature } from "./ai-limits";
import { getRequestTimeZone } from "./request-tz";
import { addDaysToDate, localDate } from "./local-date";

// EVERY write to the profiles table made on behalf of a signed-in user lives
// here. Signed-in users can no longer write profiles themselves (see
// supabase/pending/HOLD-profiles-lockdown-*.sql), because Row Level Security
// decides which ROWS a user may touch, not which COLUMNS — so a client that
// could update its own row could simply set is_pro = true or zero its own
// usage counters. Instead:
//
//   1. each function first verifies the user from the SESSION
//      (supabase.auth.getUser() — validated by Supabase Auth, never a
//      user id handed in by the caller), and only ever touches THAT user's row;
//   2. the write itself goes through createAdminClient() (service role).
//
// Server-only: `import "server-only"` makes the build fail if a Client
// Component ever imports this file, and the service-role key is never
// NEXT_PUBLIC_.
//
// Columns written here: ai_generations_used / usage_period_start,
// chat_messages_used / chat_usage_period_start, support_messages_used /
// support_usage_period_start, current_streak, longest_streak,
// last_active_date, first_study_plan_at. is_pro / stripe_customer_id /
// stripe_subscription_id are written ONLY by the Stripe webhook's locked-down
// SQL functions (set_pro_on_checkout / set_pro_on_cancellation).

async function sessionUser(supabase: SupabaseClient): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

// ---------------------------------------------------------------------------
// Quotas
// ---------------------------------------------------------------------------
//
// Every number lives in lib/ai-limits.ts. Free accounts count per month, Pro
// accounts per DAY (a generous cap instead of "unlimited"); each feature
// ("shared" tools, "ask", "support", "import") has its own counter.

// One database call does the whole check-and-count: the SQL function
// consume_usage_v2 (supabase/pending/0028_ai_limits.sql) locks the user's
// profiles row, chooses the Free or Pro limit and period (only the database
// knows whether the account is Pro at this instant), restarts the count when the
// period has changed, refuses when the allowance is used up, and otherwise adds
// one, all inside a single transaction. Two requests for the same user can't
// both slip under the limit, and nothing a client sends can change the outcome
// (the Pro "day" comes from the student's time zone but can never move
// backwards, so it can't be used to reset the count).
//
// FAILS CLOSED: if the check itself errors (database down, function missing)
// this throws, so the route returns a 500 and nothing is generated, rather
// than quietly handing out free AI. Callers must run it BEFORE the costly
// model call.
//
// One deliberate exception, for a smooth rollout: if the NEW function has not
// been created in the database yet ("function not found"), it uses the old
// consume_usage (still a real check: Free limits enforced, Pro uncounted).
// Anything else that goes wrong still fails closed, and the new "import"
// counter has no old version, so it fails closed until the SQL is run.

type UsageRow = { allowed: boolean; used: number; limit: number; isPro: boolean; periodKey: string };

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };

// PostgREST says PGRST202 when a function isn't in its schema cache; Postgres
// itself says 42883 (undefined_function).
const isMissingFunction = (error: RpcResult["error"]) =>
  Boolean(error && (error.code === "PGRST202" || error.code === "42883"));

async function consumeUsage(supabase: SupabaseClient, feature: UsageFeature): Promise<AiUsageResult> {
  const user = await sessionUser(supabase);
  if (!user) throw new Error("Not signed in");

  const timeZone = await getRequestTimeZone();
  const now = new Date();
  const free = AI_LIMITS.free[feature];
  const pro = AI_LIMITS.pro[feature];
  const kind = USAGE_KIND[feature];
  const monthKey = currentMonthStart(now);
  const dayKey = localDate(timeZone, now);
  const admin = createAdminClient();

  let row: UsageRow | null = null;

  const v2 = (await admin.rpc("consume_usage_v2", {
    p_user_id: user.id,
    p_kind: kind,
    p_free_limit: free.limit,
    p_free_period: monthKey,
    p_pro_limit: pro.limit,
    p_pro_period: dayKey,
  })) as RpcResult;

  if (!v2.error) {
    const r = (Array.isArray(v2.data) ? v2.data[0] : v2.data) as
      | { r_allowed: boolean; r_used: number; r_limit: number; r_is_pro: boolean; r_period: string }
      | null
      | undefined;
    if (r) row = { allowed: r.r_allowed, used: r.r_used, limit: r.r_limit, isPro: r.r_is_pro, periodKey: r.r_period };
  } else if (isMissingFunction(v2.error) && kind !== "import") {
    console.warn("consume_usage_v2 isn't in the database yet; using the old consume_usage (run 0028_ai_limits.sql).");
    const v1 = (await admin.rpc("consume_usage", {
      p_user_id: user.id,
      p_kind: kind,
      p_limit: free.limit,
      p_period: monthKey,
    })) as RpcResult;
    const r = (Array.isArray(v1.data) ? v1.data[0] : v1.data) as
      | { r_allowed: boolean; r_used: number; r_is_pro: boolean }
      | null
      | undefined;
    if (!v1.error && r) {
      row = {
        allowed: r.r_allowed,
        used: r.r_used,
        limit: r.r_is_pro ? pro.limit : free.limit,
        isPro: r.r_is_pro,
        periodKey: r.r_is_pro ? dayKey : monthKey,
      };
    } else {
      console.error("consume_usage failed:", v1.error?.message ?? "no row returned");
    }
  } else {
    console.error("consume_usage_v2 failed:", v2.error?.message ?? "no row returned");
  }

  if (!row) throw new Error("Usage check unavailable");

  const rule = row.isPro ? pro : free;
  const result: AiUsageResult = {
    allowed: row.allowed,
    used: row.used,
    limit: row.limit,
    isPro: row.isPro,
    feature,
    period: rule.period,
    resetsAt: nextResetAt(rule.period, timeZone, now).toISOString(),
  };

  if (!result.allowed) {
    // The notification is the user's own row in the notifications table
    // (not profiles), so the user's session client is the right one. The
    // dedupe key includes the period, so it fires once per period.
    await ensureNotification(supabase, {
      type: "ai-limit",
      message: limitReachedMessage(feature, row.isPro, timeZone, now),
      link: "/settings",
      dedupeKey: `${kind}-limit:${row.periodKey}`,
    });
  }
  return result;
}

// Study plans, study guides, practice quizzes, coach check-ins and the other
// generators: the shared pool. See the routes under app/api.
export function consumeAiGeneration(supabase: SupabaseClient): Promise<AiUsageResult> {
  return consumeUsage(supabase, "shared");
}

// Your Consultant (app/api/ask): its own separate counter ("ask").
export function consumeChatMessage(supabase: SupabaseClient): Promise<AiUsageResult> {
  return consumeUsage(supabase, "ask");
}

// Support chat (app/api/support-chat): its own separate counter.
export function consumeSupportMessage(supabase: SupabaseClient): Promise<AiUsageResult> {
  return consumeUsage(supabase, "support");
}

// Importing classes from a school platform. Nothing calls this yet (import
// isn't available), but the counter and limits are ready: call it BEFORE doing
// the import.
export function consumeImport(supabase: SupabaseClient): Promise<AiUsageResult> {
  return consumeUsage(supabase, "import");
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

// Called from app/api/study-plan on a successful generation. Records when the
// achievement was first earned: set once, never overwritten. The update only
// matches a row whose first_study_plan_at is still empty, so two requests at
// once can't change the stored time.
export async function markFirstStudyPlanGenerated(supabase: SupabaseClient): Promise<void> {
  const user = await sessionUser(supabase);
  if (!user) return;

  const admin = createAdminClient();
  // Make sure the row exists (accounts older than the signup trigger may not
  // have one). Does nothing if it already does.
  await admin.from("profiles").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  const { error } = await admin
    .from("profiles")
    .update({ first_study_plan_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("first_study_plan_at", null);

  if (error) console.error("markFirstStudyPlanGenerated failed:", error);
}

// ---------------------------------------------------------------------------
// Daily streak
// ---------------------------------------------------------------------------

export type StreakResult = { streak: number; longest: number; increased: boolean };

// Called once per /app visit (app/api/streak). Bumps the streak the first
// time a user shows up on a given day, resets it if a day was missed, and
// is a no-op on repeat visits the same day. Returns null if nobody is signed in.
// "Day" is the STUDENT'S calendar day in `timeZone` (the browser's zone, see
// lib/request-tz.ts), not the server's UTC day, so a student who studies at 9 pm
// keeps one streak day instead of splitting across two UTC dates.
//
// Concurrent visits (two tabs opening at once) can't double-count: the write
// only matches a row whose last_active_date is not already today, so only
// one request wins; the other just reports the stored values.
export async function recordDailyVisit(
  supabase: SupabaseClient,
  timeZone: string = "UTC"
): Promise<StreakResult | null> {
  const user = await sessionUser(supabase);
  if (!user) return null;

  const admin = createAdminClient();
  const read = async () => {
    const { data } = await admin
      .from("profiles")
      .select("current_streak, longest_streak, last_active_date")
      .eq("user_id", user.id)
      .maybeSingle();
    return {
      streak: (data?.current_streak as number | undefined) ?? 0,
      longest: (data?.longest_streak as number | undefined) ?? 0,
      lastActive: (data?.last_active_date as string | null | undefined) ?? null,
    };
  };

  const today = localDate(timeZone);
  const before = await read();
  if (before.lastActive === today) {
    return { streak: before.streak, longest: before.longest, increased: false };
  }

  const yesterday = addDaysToDate(today, -1);
  const nextStreak = before.lastActive === yesterday ? before.streak + 1 : 1;
  const nextLongest = Math.max(before.longest, nextStreak);

  await admin.from("profiles").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  const { data: updated, error } = await admin
    .from("profiles")
    .update({
      current_streak: nextStreak,
      longest_streak: nextLongest,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .or(`last_active_date.is.null,last_active_date.neq.${today}`)
    .select("user_id");

  if (error) console.error("recordDailyVisit failed:", error);

  if (error || !updated || updated.length === 0) {
    // Lost the race (or the write failed): report what is actually stored.
    const after = await read();
    return { streak: after.streak, longest: after.longest, increased: false };
  }
  return { streak: nextStreak, longest: nextLongest, increased: nextStreak > before.streak };
}
