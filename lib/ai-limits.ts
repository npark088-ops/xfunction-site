import { addDaysToDate, formatCalendarDate, localDate, localDayStart } from "./local-date";

// ============================================================================
// EVERY AI LIMIT IN THE APP LIVES HERE. Change a number below and it changes
// the server's check, the messages students see, Settings, and the upgrade
// prompt. Nothing else hard-codes a limit.
//
//   limit   how many uses a student gets in one period
//   period  "month": resets on the 1st (UTC month, chosen by the server)
//           "day":   resets at the student's own midnight (their time zone)
//
// Free plans count per MONTH, Pro plans count per DAY (so Pro is generous but
// not unlimited, which keeps AI costs predictable).
// ============================================================================

export type UsageFeature = "shared" | "import" | "ask" | "support";
export type UsagePeriod = "month" | "day";

export interface LimitRule {
  limit: number;
  period: UsagePeriod;
}

export const AI_LIMITS: Record<"free" | "pro", Record<UsageFeature, LimitRule>> = {
  free: {
    // Study plans, study guides, practice quizzes, coach check-ins, the
    // combined plan, task breakdowns, time estimates and the weekly digest tip
    // all draw from this one shared pool.
    shared: { limit: 3, period: "month" },
    // Importing classes from a school platform (not available yet; the limit is
    // ready for when it is).
    import: { limit: 5, period: "month" },
    // Messages to Your Consultant.
    ask: { limit: 20, period: "month" },
    // Support chat. Not in the original list; kept at its old size.
    support: { limit: 10, period: "month" },
  },
  pro: {
    shared: { limit: 100, period: "day" },
    import: { limit: 30, period: "day" },
    ask: { limit: 100, period: "day" },
    // Support chat. Not in the original list; assumed to match Ask. Change here.
    support: { limit: 100, period: "day" },
  },
};

// The names the database function uses for each feature (see
// supabase/pending/0028_ai_limits.sql). "ask" is stored in the existing
// "chat" counter and "shared" in the existing "ai" counter.
export const USAGE_KIND: Record<UsageFeature, "ai" | "chat" | "support" | "import"> = {
  shared: "ai",
  ask: "chat",
  support: "support",
  import: "import",
};

export function limitRule(feature: UsageFeature, isPro: boolean): LimitRule {
  return AI_LIMITS[isPro ? "pro" : "free"][feature];
}

// First day of the current UTC month, "YYYY-MM-DD". The FREE period key. It is
// computed on the server, never taken from the browser.
export function currentMonthStart(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

// The key a usage counter is stored under for this account right now: the
// month for Free, the student's local date for Pro.
export function usagePeriodKey(
  feature: UsageFeature,
  isPro: boolean,
  timeZone: string,
  now: Date = new Date()
): string {
  return limitRule(feature, isPro).period === "day" ? localDate(timeZone, now) : currentMonthStart(now);
}

// The moment the current period ends and the count goes back to zero.
export function nextResetAt(period: UsagePeriod, timeZone: string, now: Date = new Date()): Date {
  if (period === "day") {
    return localDayStart(timeZone, addDaysToDate(localDate(timeZone, now), 1));
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

// "in about 5 hours", "in about 40 minutes".
function relativeFromNow(at: Date, now: Date): string {
  const minutes = Math.max(1, Math.round((at.getTime() - now.getTime()) / 60000));
  if (minutes < 60) return `in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
  return `in about ${Math.round(hours / 24)} days`;
}

// Plain-language "when does this reset", in the student's own time zone:
//   day:   "at midnight (in about 5 hours)"
//   month: "on Dec 1 at 12:00 AM" (shown in their time zone, so it may read as
//          the evening of the 30th for students behind UTC)
export function describeReset(period: UsagePeriod, timeZone: string, now: Date = new Date()): string {
  const at = nextResetAt(period, timeZone, now);
  if (period === "day") return `at midnight (${relativeFromNow(at, now)})`;
  const date = formatCalendarDate(localDate(timeZone, at), { month: "short", day: "numeric" });
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(at);
  return `on ${date} at ${time}`;
}

const NOUN: Record<UsageFeature, { many: string; free: string }> = {
  shared: { many: "AI generations", free: "free AI generations" },
  ask: { many: "messages to Your Consultant", free: "free messages to Your Consultant" },
  support: { many: "Support messages", free: "free Support messages" },
  import: { many: "class imports", free: "free class imports" },
};

// The sentence a student sees when they hit a limit.
export function limitReachedMessage(
  feature: UsageFeature,
  isPro: boolean,
  timeZone: string,
  now: Date = new Date()
): string {
  const rule = limitRule(feature, isPro);
  const when = describeReset(rule.period, timeZone, now);
  if (isPro) {
    return `You've reached today's limit of ${rule.limit} ${NOUN[feature].many}. It resets ${when}.`;
  }
  const pro = AI_LIMITS.pro[feature];
  return `You've used all ${rule.limit} ${NOUN[feature].free} this ${rule.period}. It resets ${when}. XFunction Pro raises this to ${pro.limit} per day.`;
}

// Short "3 per month" / "100 per day" label for UI copy.
export function formatLimit(rule: LimitRule): string {
  return `${rule.limit} per ${rule.period}`;
}
