import type { SupabaseClient } from "@supabase/supabase-js";

// Free-tier AI limits and READ-ONLY usage snapshots. This file is safe to
// import from anywhere: it never writes. Everything that COUNTS usage lives
// in lib/profile-server.ts (server-only) — signed-in users can't write their
// own profiles row, so the counters can only be advanced by the server, in
// one atomic step (see supabase/pending/0026_consume_usage.sql).

// Combined across study plans, study guides, practice quizzes, and
// coach check-ins — see app/api/study-plan, app/api/study-guide,
// app/api/practice-quiz, app/api/coach-overview.
export const FREE_AI_GENERATIONS_PER_MONTH = 3;

// Your Consultant (the AI chat advisor, see app/api/ask) has its own
// separate free-tier quota — a conversation naturally takes more turns
// than "generate one study plan," so it gets its own, larger allowance
// instead of sharing the 3/month pool above and evaporating it in one
// exchange.
export const FREE_CHAT_MESSAGES_PER_MONTH = 10;

// Support chat (see app/api/support-chat) also gets its own quota,
// separate from both pools above — it's a different feature for a
// different purpose (account/app help, not academic help), so heavy use
// of one shouldn't eat into the other. Same size as Your Consultant's
// allowance since both are open-ended chats.
export const FREE_SUPPORT_MESSAGES_PER_MONTH = 10;

export type AiUsageResult = {
  allowed: boolean;
  used: number;
  limit: number;
  isPro: boolean;
};

// First day of the current UTC month, as YYYY-MM-DD — the billing period key
// stored in the *_usage_period_start columns.
export function currentMonthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

// Read-only — for displaying plan/usage status (e.g. the Settings page)
// without counting a generation against the quota.
export async function getAiUsageSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<AiUsageResult> {
  const periodStart = currentMonthStart();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro, ai_generations_used, usage_period_start")
    .eq("user_id", userId)
    .maybeSingle();

  const usedThisPeriod =
    profile && profile.usage_period_start === periodStart ? profile.ai_generations_used : 0;

  return {
    allowed: true,
    used: usedThisPeriod,
    limit: FREE_AI_GENERATIONS_PER_MONTH,
    isPro: profile?.is_pro ?? false,
  };
}

// Read-only counterpart for Your Consultant's separate counter
// (chat_messages_used / chat_usage_period_start).
export async function getChatUsageSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<AiUsageResult> {
  const periodStart = currentMonthStart();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro, chat_messages_used, chat_usage_period_start")
    .eq("user_id", userId)
    .maybeSingle();

  const usedThisPeriod =
    profile && profile.chat_usage_period_start === periodStart ? profile.chat_messages_used : 0;

  return {
    allowed: true,
    used: usedThisPeriod,
    limit: FREE_CHAT_MESSAGES_PER_MONTH,
    isPro: profile?.is_pro ?? false,
  };
}

// Read-only counterpart for Support's separate counter
// (support_messages_used / support_usage_period_start).
export async function getSupportUsageSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<AiUsageResult> {
  const periodStart = currentMonthStart();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro, support_messages_used, support_usage_period_start")
    .eq("user_id", userId)
    .maybeSingle();

  const usedThisPeriod =
    profile && profile.support_usage_period_start === periodStart ? profile.support_messages_used : 0;

  return {
    allowed: true,
    used: usedThisPeriod,
    limit: FREE_SUPPORT_MESSAGES_PER_MONTH,
    isPro: profile?.is_pro ?? false,
  };
}
