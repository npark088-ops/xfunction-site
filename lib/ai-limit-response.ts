import "server-only";
import type { AiUsageResult } from "./ai-usage";
import { limitReachedMessage } from "./ai-limits";
import { getRequestTimeZone } from "./request-tz";

// The one reply every AI route sends when a student is out of allowance.
//
//   Free account -> 402 "upgrade_required": the app shows the upgrade prompt.
//   Pro account  -> 429 "daily_limit_reached": a plain message (there is
//                   nothing to upgrade to), including when it resets.
//
// `message` already says how many were allowed and WHEN IT RESETS in the
// student's own time zone (lib/ai-limits.ts). `resetsAt` (ISO time) and the
// counts are included for any screen that wants to show them itself.
export async function limitReachedResponse(usage: AiUsageResult): Promise<Response> {
  const timeZone = await getRequestTimeZone();
  return Response.json(
    {
      error: usage.isPro ? "daily_limit_reached" : "upgrade_required",
      message: limitReachedMessage(usage.feature, usage.isPro, timeZone),
      limit: usage.limit,
      used: usage.used,
      isPro: usage.isPro,
      period: usage.period,
      resetsAt: usage.resetsAt,
    },
    { status: usage.isPro ? 429 : 402 }
  );
}
