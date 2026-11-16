import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import { ensureNotification } from "./notifications";
import {
  type AiUsageResult,
  FREE_AI_GENERATIONS_PER_MONTH,
  FREE_CHAT_MESSAGES_PER_MONTH,
  FREE_SUPPORT_MESSAGES_PER_MONTH,
  currentMonthStart,
} from "./ai-usage";

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

type UsageKind = "ai" | "chat" | "support";

const USAGE: Record<
  UsageKind,
  { limit: number; notice: (periodStart: string) => { message: string; dedupeKey: string } }
> = {
  ai: {
    limit: FREE_AI_GENERATIONS_PER_MONTH,
    notice: (p) => ({
      message: `You've used all ${FREE_AI_GENERATIONS_PER_MONTH} free AI generations this month. Upgrade to Pro for unlimited access.`,
      // Only fires once per billing period — hitting the limit repeatedly in
      // the same month doesn't spam the bell.
      dedupeKey: `ai-limit:${p}`,
    }),
  },
  chat: {
    limit: FREE_CHAT_MESSAGES_PER_MONTH,
    notice: (p) => ({
      message: `You've used all ${FREE_CHAT_MESSAGES_PER_MONTH} free messages to Your Consultant this month. Upgrade to Pro for unlimited access.`,
      dedupeKey: `chat-limit:${p}`,
    }),
  },
  support: {
    limit: FREE_SUPPORT_MESSAGES_PER_MONTH,
    notice: (p) => ({
      message: `You've used all ${FREE_SUPPORT_MESSAGES_PER_MONTH} free messages to Support this month. Upgrade to Pro for unlimited access.`,
      dedupeKey: `support-limit:${p}`,
    }),
  },
};

type ConsumeUsageRow = { r_allowed: boolean; r_used: number; r_is_pro: boolean };

// One database call does the whole check-and-count: the SQL function
// consume_usage (supabase/pending/0026_consume_usage.sql) locks the user's
// profiles row, resets the counter if the month rolled over, lets Pro users
// through uncounted, refuses when the free allowance is used up, and
// otherwise adds one — all inside a single transaction. Two requests for the
// same user can't both slip under the limit (the old read-then-write could
// be raced), and nothing a client sends can change the outcome.
//
// FAILS CLOSED: if the check itself errors (database down, function missing)
// this throws, so the route returns a 500 and nothing is generated, rather
// than quietly handing out unlimited free AI. Callers must run it BEFORE the
// costly model call.
async function consumeUsage(supabase: SupabaseClient, kind: UsageKind): Promise<AiUsageResult> {
  const user = await sessionUser(supabase);
  if (!user) throw new Error("Not signed in");

  const cfg = USAGE[kind];
  const periodStart = currentMonthStart();

  const { data, error } = await createAdminClient().rpc("consume_usage", {
    p_user_id: user.id,
    p_kind: kind,
    p_limit: cfg.limit,
    p_period: periodStart,
  });
  const row = (Array.isArray(data) ? data[0] : data) as ConsumeUsageRow | null | undefined;
  if (error || !row) {
    console.error("consume_usage failed:", error?.message ?? "no row returned");
    throw new Error("Usage check unavailable");
  }

  const result: AiUsageResult = {
    allowed: row.r_allowed,
    used: row.r_used,
    limit: cfg.limit,
    isPro: row.r_is_pro,
  };

  if (!result.allowed) {
    // The notification is the user's own row in the notifications table
    // (not profiles), so the user's session client is the right one.
    const { message, dedupeKey } = cfg.notice(periodStart);
    await ensureNotification(supabase, { type: "ai-limit", message, link: "/settings", dedupeKey });
  }
  return result;
}

// Combined across study plans, study guides, practice quizzes, coach
// check-ins and the other generators — see the routes under app/api.
export function consumeAiGeneration(supabase: SupabaseClient): Promise<AiUsageResult> {
  return consumeUsage(supabase, "ai");
}

// Your Consultant (app/api/ask) — its own separate counter.
export function consumeChatMessage(supabase: SupabaseClient): Promise<AiUsageResult> {
  return consumeUsage(supabase, "chat");
}

// Support chat (app/api/support-chat) — its own separate counter.
export function consumeSupportMessage(supabase: SupabaseClient): Promise<AiUsageResult> {
  return consumeUsage(supabase, "support");
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

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// Called once per /app visit (app/api/streak). Bumps the streak the first
// time a user shows up on a given UTC day, resets it if a day was missed, and
// is a no-op on repeat visits the same day. Returns null if nobody is signed in.
//
// Concurrent visits (two tabs opening at once) can't double-count: the write
// only matches a row whose last_active_date is not already today, so only
// one request wins; the other just reports the stored values.
export async function recordDailyVisit(supabase: SupabaseClient): Promise<StreakResult | null> {
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

  const today = isoDay(new Date());
  const before = await read();
  if (before.lastActive === today) {
    return { streak: before.streak, longest: before.longest, increased: false };
  }

  const yesterday = isoDay(new Date(Date.now() - 24 * 60 * 60 * 1000));
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
