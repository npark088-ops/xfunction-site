import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureNotification } from "./notifications";

// Combined across study plans, study guides, practice quizzes, and
// coach check-ins — see app/api/study-plan, app/api/study-guide,
// app/api/practice-quiz, app/api/coach-overview.
export const FREE_AI_GENERATIONS_PER_MONTH = 3;

export type AiUsageResult = {
  allowed: boolean;
  used: number;
  limit: number;
  isPro: boolean;
};

function currentMonthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

// Checks the caller's monthly AI generation quota and, if they still have
// room, atomically-enough (single read + single write, fine at this
// app's scale) counts this call against it. Pro users always pass
// without being counted. Call this BEFORE doing the actual (costly)
// generation so a blocked request never reaches Anthropic.
export async function consumeAiGeneration(
  supabase: SupabaseClient,
  userId: string
): Promise<AiUsageResult> {
  const periodStart = currentMonthStart();

  const { data: existing } = await supabase
    .from("profiles")
    .select("is_pro, ai_generations_used, usage_period_start")
    .eq("user_id", userId)
    .maybeSingle();

  const profile =
    existing ??
    (
      await supabase
        .from("profiles")
        .insert({ user_id: userId, usage_period_start: periodStart })
        .select("is_pro, ai_generations_used, usage_period_start")
        .single()
    ).data;

  // Insert/select failed for some reason — fail open rather than block
  // a user over a transient DB error.
  if (!profile) {
    return { allowed: true, used: 0, limit: FREE_AI_GENERATIONS_PER_MONTH, isPro: false };
  }

  const usedThisPeriod = profile.usage_period_start === periodStart ? profile.ai_generations_used : 0;

  if (profile.is_pro) {
    return { allowed: true, used: usedThisPeriod, limit: FREE_AI_GENERATIONS_PER_MONTH, isPro: true };
  }

  if (usedThisPeriod >= FREE_AI_GENERATIONS_PER_MONTH) {
    // Only fires once per billing period — dedupe_key includes
    // periodStart, so hitting the limit repeatedly in the same month
    // doesn't spam the bell.
    await ensureNotification(supabase, {
      type: "ai-limit",
      message: `You've used all ${FREE_AI_GENERATIONS_PER_MONTH} free AI generations this month. Upgrade to Pro for unlimited access.`,
      link: "/settings",
      dedupeKey: `ai-limit:${periodStart}`,
    });
    return { allowed: false, used: usedThisPeriod, limit: FREE_AI_GENERATIONS_PER_MONTH, isPro: false };
  }

  const nextUsed = usedThisPeriod + 1;
  await supabase
    .from("profiles")
    .update({
      ai_generations_used: nextUsed,
      usage_period_start: periodStart,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return { allowed: true, used: nextUsed, limit: FREE_AI_GENERATIONS_PER_MONTH, isPro: false };
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
