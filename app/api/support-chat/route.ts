import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "../../../lib/supabase/server";
import { consumeSupportMessage } from "../../../lib/ai-usage";
import { buildSupportContext } from "../../../lib/support-context";
import { SUPPORT_EMAIL } from "../../../lib/support-config";
import { captureServerEvent } from "../../../lib/posthog-server";
import { getAiModel } from "../../../lib/ai-model";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_HISTORY_MESSAGES = 20;

type ChatMessage = { role: "user" | "assistant"; content: string };

// Support chat (see components/SupportChatPanel.tsx) — app/account help,
// deliberately separate from Your Consultant (app/api/ask, academic
// help). Has its own free-tier quota — see lib/ai-usage.ts.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const usage = await consumeSupportMessage(supabase, user.id);
  if (!usage.allowed) {
    return Response.json(
      {
        error: "upgrade_required",
        message: `You've used all ${usage.limit} free messages to Support this month.`,
      },
      { status: 402 }
    );
  }

  const { messages } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "No messages provided" }, { status: 400 });
  }

  const history: ChatMessage[] = messages
    .slice(-MAX_HISTORY_MESSAGES)
    .filter((m: unknown): m is { role: unknown; content: unknown } => typeof m === "object" && m !== null)
    .map((m: { role: unknown; content: unknown }) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? ""),
    }));

  const context = await buildSupportContext(supabase, user.id);

  const systemPrompt = `
You are XFunction Support, the in-app assistant for account and product questions inside XFunction — a grade-tracking and study-planning app for students.

You are NOT an academic tutor. XFunction has a separate feature called "Your Consultant" for that (questions about grades, courses, or study advice). If a student asks something academic, say clearly that you're the support assistant and point them to Your Consultant instead of answering it yourself.

Stay strictly within these support topics:
- Billing and subscription questions (what Free vs Pro includes, how to upgrade, how to manage/cancel billing — the Settings page has a "Manage billing" button that opens Stripe's billing portal for that).
- How XFunction's features work (Today, Overview, Courses, Schedule, Trends, Tasks, Settings, focus timer, notifications, achievements, etc.).
- Troubleshooting a platform connection (Canvas, Google Classroom, Schoology, Moodle, Blackboard — all connectable from the Courses page's "Connect your platform" section; PowerSchool/Infinite Campus/Skyward/StudentVUE-Synergy are all "Coming soon" for everyone, not broken for this student specifically).
- Helping a student describe or report a bug clearly.

The student's current account state (use this to give specific, accurate answers — don't guess or make up numbers not shown here):
${context}

Important — know when to stop and hand off:
If a question is genuinely beyond what you can resolve here — a billing dispute, a refund request, or a bug that needs an actual code fix rather than a troubleshooting step — say so plainly and directly, and tell the student to email ${SUPPORT_EMAIL}. Do not pretend to process a refund, promise a fix, or guess at policies you don't actually have information about.

Rules:
- Be concise and practical — a few sentences, not a wall of text, unless the student's question genuinely needs more.
- No markdown headers or bullet-point walls for a normal question.
- Never fabricate specific numbers, policies, or promises you're not given above.
`;

  try {
    const response = await anthropic.messages.create({
      model: getAiModel(usage.isPro),
      max_tokens: 600,
      system: systemPrompt,
      messages: history,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    captureServerEvent(user.id, "ai_feature_used", { feature: "support_chat_message" });
    return Response.json({ reply: text.trim() });
  } catch (error) {
    console.error("Support chat failed:", error);
    return Response.json({ error: "Failed to get a response" }, { status: 500 });
  }
}
