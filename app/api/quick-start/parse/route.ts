import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "../../../../lib/supabase/server";
import { consumeImport } from "../../../../lib/profile-server";
import { getAiModel } from "../../../../lib/ai-model";
import { limitReachedResponse } from "../../../../lib/ai-limit-response";
import { getRequestTimeZone } from "../../../../lib/request-tz";
import { localDate, localWeekday } from "../../../../lib/local-date";
import { captureServerEvent } from "../../../../lib/posthog-server";
import { QS_LIMITS, checkPastedText, normalizeQuickStart, parseModelJson } from "../../../../lib/quick-start";
import {
  buildQuickStartSystemPrompt,
  buildQuickStartUserMessage,
  weekdayName,
} from "../../../../lib/quick-start-prompt";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Reading a long syllabus can take a while.
export const maxDuration = 60;

// Quick Start, step 1: pasted text -> a PREVIEW of courses and assignments.
//
// This route NEVER writes courses or assignments. It only asks the AI and
// returns what it found; the student reviews and edits it, and only
// /api/quick-start/confirm saves anything.
//
// Order matters (same rule as every AI route): sign-in -> cheap input checks
// (bad input shouldn't cost an import) -> the "import" allowance check, which
// FAILS CLOSED -> the AI call -> validation of the AI's answer.
//
// PRIVACY: the pasted text and the AI's raw answer are never stored and never
// logged. Errors below log only an error type and status code, never content.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  // ---- read and check the input (before spending an import)
  const body = await req.text();
  if (body.length > QS_LIMITS.maxChars * 4 + 2000) {
    return Response.json(
      { error: "too_long", message: `That's too long. Please keep it under ${QS_LIMITS.maxChars.toLocaleString("en-US")} characters.` },
      { status: 413 }
    );
  }
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return Response.json({ error: "bad_request", message: "Something went wrong sending that. Please try again." }, { status: 400 });
  }
  const checked = checkPastedText((parsedBody as { text?: unknown } | null)?.text);
  if (!checked.ok) {
    return Response.json({ error: "bad_input", message: checked.message }, { status: 400 });
  }

  // ---- the student's own "today" (their time zone), for relative dates
  const timeZone = await getRequestTimeZone();
  const today = localDate(timeZone);
  const weekday = weekdayName(localWeekday(timeZone));

  // ---- allowance: the "import" pool in lib/ai-limits.ts. Fails closed.
  let usage;
  try {
    usage = await consumeImport(supabase);
  } catch (error) {
    console.error("Quick Start: usage check unavailable:", error instanceof Error ? error.message : "unknown");
    return Response.json(
      { error: "unavailable", message: "Quick Start isn't available right now. You can add your classes by hand or load the demo data." },
      { status: 503 }
    );
  }
  if (!usage.allowed) {
    return limitReachedResponse(usage);
  }

  // ---- ask the AI (the text goes in as quoted data)
  const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  let reply = "";
  try {
    const response = await anthropic.messages.create({
      model: getAiModel(usage.isPro),
      max_tokens: 4096,
      system: buildQuickStartSystemPrompt(),
      messages: [{ role: "user", content: buildQuickStartUserMessage(checked.text, today, weekday, nonce) }],
    });
    reply = response.content[0]?.type === "text" ? response.content[0].text : "";
  } catch (error) {
    const status = (error as { status?: number } | null)?.status;
    console.error("Quick Start: AI call failed:", error instanceof Error ? error.name : "unknown", status ?? "");
    return Response.json(
      { error: "ai_failed", message: "I couldn't read that just now. You can try again, add your classes by hand, or load the demo data." },
      { status: 502 }
    );
  }

  // ---- check what came back. It is untrusted: only whitelisted fields survive.
  const result = normalizeQuickStart(parseModelJson(reply), { today, mode: "lenient" });
  if (!result.ok) {
    return Response.json(
      {
        error: "unreadable",
        message:
          result.message === "I couldn't find any classes in that text."
            ? "I couldn't find any classes in that text. Try pasting a syllabus, a list of classes, or what's due."
            : "I couldn't make sense of that. Try pasting a bit less, or add your classes by hand.",
      },
      { status: 422 }
    );
  }

  captureServerEvent(user.id, "ai_feature_used", { feature: "quick_start" });
  return Response.json({ courses: result.preview.courses, warnings: result.preview.warnings, today });
}
