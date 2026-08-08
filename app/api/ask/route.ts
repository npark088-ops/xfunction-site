import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "../../../lib/supabase/server";
import { consumeChatMessage } from "../../../lib/ai-usage";
import { buildAcademicContext } from "../../../lib/academic-context";
import { captureServerEvent } from "../../../lib/posthog-server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Keep the request small and bounded — the client sends the whole
// session's history each turn (the API is stateless), and this caps how
// much of it we forward if a conversation runs long.
const MAX_HISTORY_MESSAGES = 20;

type ChatMessage = { role: "user" | "assistant"; content: string };

// Your Consultant has its own free-tier quota (10 messages/month),
// tracked completely separately from the shared 3/month study
// plan/guide/quiz/coach-insight quota — see lib/ai-usage.ts. Pro users
// are unlimited on both.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const usage = await consumeChatMessage(supabase, user.id);
  if (!usage.allowed) {
    return Response.json(
      {
        error: "upgrade_required",
        message: `You've used all ${usage.limit} free messages to Your Consultant this month.`,
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

  const context = buildAcademicContext();

  const systemPrompt = `
You are Your Consultant, the student's personal AI academic advisor inside XFunction, chatting with them about their actual grades and coursework. This is a live chat, not a report — answer naturally and conversationally.

Ground every answer in the student's real data below. Reference specific courses, grades, categories, and assignments by name when relevant — never give generic study advice that isn't tied to their actual situation.

${context}

Rules:
- Be direct and specific — cite real numbers and names from the data above.
- Keep answers focused and conversational (a few sentences to a short paragraph) unless the student's question calls for more detail, like asking for a full breakdown.
- If the student asks something the data above can't answer (e.g. a teacher's grading style, school policy), say so plainly instead of guessing.
- No markdown headers or bullet-point walls for a normal question — write like you're texting a knowledgeable friend, unless a list is genuinely the clearest way to answer.
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      system: systemPrompt,
      messages: history,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    captureServerEvent(user.id, "ai_feature_used", { feature: "chat_message" });
    return Response.json({ reply: text.trim() });
  } catch (error) {
    console.error("Your Consultant failed:", error);
    return Response.json({ error: "Failed to get a response" }, { status: 500 });
  }
}
