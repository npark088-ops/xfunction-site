// Tiered model selection for every AI generation feature (study plans,
// guides, quizzes, coach check-ins, task breakdown, Your Consultant,
// Support chat). Free-tier users get a fast, cost-efficient model; Pro
// users get a more capable one producing noticeably better, more
// detailed output — same prompts, same logic, only the model changes.
//
// This is deliberately NOT tied to lib/ai-usage.ts's quota functions —
// every call site already gets `isPro` back from consumeAiGeneration /
// consumeChatMessage / consumeSupportMessage, so no extra profile
// lookup is needed here. Free-tier generation limits (3/month for
// study tools, 10/month for chat) are entirely unaffected by this —
// this only changes which model answers a request that was already
// allowed through.
export const FREE_TIER_MODEL = "claude-haiku-5-5";
export const PRO_TIER_MODEL = "claude-sonnet-5-5";

export function getAiModel(isPro: boolean): string {
  return isPro ? PRO_TIER_MODEL : FREE_TIER_MODEL;
}
