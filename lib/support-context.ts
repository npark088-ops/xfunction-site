import type { SupabaseClient } from "@supabase/supabase-js";
import { getAiUsageSnapshot, getChatUsageSnapshot } from "./ai-usage";
import { getCanvasConnection } from "./canvas-token-store";
import { getGoogleClassroomConnection } from "./google-classroom-token-store";
import { getSchoologyConnection } from "./schoology-token-store";
import { getMoodleConnection } from "./moodle-token-store";
import { getBlackboardConnection } from "./blackboard-token-store";

// Shared by app/api/support-chat — assembles the account-level facts
// (plan, quota usage, platform connections) the support assistant needs
// to give accurate, account-specific answers instead of generic ones.
// Deliberately NOT the academic data buildAcademicContext() assembles
// (lib/academic-context.ts) — support has no business seeing or
// discussing grades, it only needs to know the state of the ACCOUNT.
//
// allSettled, not all — one platform's connection lookup failing (e.g.
// a newer platform's migration hasn't been run against this Supabase
// project yet, same failure mode that once broke the Courses page)
// should degrade to "unknown" for that one line, not take down support
// chat entirely — of all the places in this app that must stay up, the
// one students reach for when something else is broken is the last one
// that should also break.
export async function buildSupportContext(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const [
    aiUsageResult,
    chatUsageResult,
    canvasResult,
    googleResult,
    schoologyResult,
    moodleResult,
    blackboardResult,
  ] = await Promise.allSettled([
    getAiUsageSnapshot(supabase, userId),
    getChatUsageSnapshot(supabase, userId),
    getCanvasConnection(supabase, userId),
    getGoogleClassroomConnection(supabase, userId),
    getSchoologyConnection(supabase, userId),
    getMoodleConnection(supabase, userId),
    getBlackboardConnection(supabase, userId),
  ]);

  const isPro =
    aiUsageResult.status === "fulfilled" ? aiUsageResult.value.isPro : false;

  const planLine = isPro
    ? "Plan: XFunction Pro (unlimited AI generations and chat messages)."
    : aiUsageResult.status === "fulfilled" && chatUsageResult.status === "fulfilled"
      ? `Plan: Free. ${aiUsageResult.value.used}/${aiUsageResult.value.limit} AI generations used this month (study plans/guides/quizzes/coach check-ins), ${chatUsageResult.value.used}/${chatUsageResult.value.limit} messages to Your Consultant used this month.`
      : "Plan: unknown (usage lookup failed — don't guess, ask the student to check Settings).";

  const connectionLine = (
    name: string,
    result: PromiseSettledResult<{ [key: string]: unknown } | null>
  ): string => {
    if (result.status === "rejected") return `${name}: status unknown (lookup failed)`;
    return `${name}: ${result.value ? "connected" : "not connected"}`;
  };

  const connections = [
    connectionLine("Canvas", canvasResult),
    connectionLine("Google Classroom", googleResult),
    connectionLine("Schoology", schoologyResult),
    connectionLine("Moodle", moodleResult),
    connectionLine("Blackboard", blackboardResult),
  ].join("; ");

  return `${planLine}

Platform connections (LMS — coursework/assignments): ${connections}
Platform connections (SIS — grades/records): PowerSchool, Infinite Campus, Skyward, and StudentVUE/Synergy are all "Coming soon" for every student — none are available to connect yet, this isn't specific to this student's account.`;
}
