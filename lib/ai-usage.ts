import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type UsageFeature,
  type UsagePeriod,
  limitRule,
  nextResetAt,
  usagePeriodKey,
} from "./ai-limits";

// READ-ONLY usage snapshots (for Settings and the Support chat's context). The
// limits themselves are all in lib/ai-limits.ts. This file never writes:
// everything that COUNTS usage lives in lib/profile-server.ts (server-only),
// because signed-in users can't write their own profiles row; the counters can
// only be advanced by the server, in one atomic step (see
// supabase/pending/0028_ai_limits.sql, and 0026 for the older version).

export type AiUsageResult = {
  allowed: boolean;
  used: number;
  limit: number;
  isPro: boolean;
  // Which feature's counter this is, how long one period is (Free: a month,
  // Pro: a day), and when it next resets (ISO time; display it in the student's
  // own time zone).
  feature: UsageFeature;
  period: UsagePeriod;
  resetsAt: string;
};

// The profile columns each feature's counter lives in.
const COUNTER_COLUMNS: Record<UsageFeature, { used: string; periodStart: string }> = {
  shared: { used: "ai_generations_used", periodStart: "usage_period_start" },
  ask: { used: "chat_messages_used", periodStart: "chat_usage_period_start" },
  support: { used: "support_messages_used", periodStart: "support_usage_period_start" },
  import: { used: "import_used", periodStart: "import_usage_period_start" },
};

// Read-only: how much of the limit this student has used right now, without
// counting anything. `timeZone` is the student's own (see lib/request-tz.ts);
// it decides which "day" a Pro account's count belongs to.
export async function getUsageSnapshot(
  supabase: SupabaseClient,
  userId: string,
  feature: UsageFeature,
  timeZone = "UTC"
): Promise<AiUsageResult> {
  const columns = COUNTER_COLUMNS[feature];
  const { data } = await supabase
    .from("profiles")
    .select(`is_pro, ${columns.used}, ${columns.periodStart}`)
    .eq("user_id", userId)
    .maybeSingle();

  const row = data as unknown as Record<string, unknown> | null;
  const isPro = Boolean(row?.is_pro);
  const rule = limitRule(feature, isPro);
  const key = usagePeriodKey(feature, isPro, timeZone);
  const storedPeriod = (row?.[columns.periodStart] as string | undefined) ?? null;
  const storedUsed = (row?.[columns.used] as number | undefined) ?? 0;

  // Same rule as the database function: Free counts only inside the current
  // month; Pro counts under the later of the stored day and today, never
  // backwards (see supabase/pending/0028_ai_limits.sql).
  const sameWindow = storedPeriod !== null && (isPro ? storedPeriod >= key : storedPeriod === key);

  return {
    allowed: true,
    used: sameWindow ? storedUsed : 0,
    limit: rule.limit,
    isPro,
    feature,
    period: rule.period,
    resetsAt: nextResetAt(rule.period, timeZone).toISOString(),
  };
}

export const getAiUsageSnapshot = (supabase: SupabaseClient, userId: string, timeZone?: string) =>
  getUsageSnapshot(supabase, userId, "shared", timeZone);

// Your Consultant's counter.
export const getChatUsageSnapshot = (supabase: SupabaseClient, userId: string, timeZone?: string) =>
  getUsageSnapshot(supabase, userId, "ask", timeZone);

export const getSupportUsageSnapshot = (supabase: SupabaseClient, userId: string, timeZone?: string) =>
  getUsageSnapshot(supabase, userId, "support", timeZone);

export const getImportUsageSnapshot = (supabase: SupabaseClient, userId: string, timeZone?: string) =>
  getUsageSnapshot(supabase, userId, "import", timeZone);
