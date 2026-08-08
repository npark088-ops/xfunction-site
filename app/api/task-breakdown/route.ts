import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "../../../lib/supabase/server";
import { consumeAiGeneration } from "../../../lib/ai-usage";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Shares the same 3/month free-tier quota as the study plan/guide/quiz
// routes (see lib/ai-usage.ts) — this route previously had no auth
// check or quota gating at all, which meant it was both unmetered
// (unlike every other AI feature) and, since it never checked for a
// signed-in user, would 500 if it ever got called from a
// logged-out ai_generations_used lookup went wrong.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const usage = await consumeAiGeneration(supabase, user.id);
  if (!usage.allowed) {
    return Response.json(
      {
        error: "upgrade_required",
        message: `You've used all ${usage.limit} free AI generations this month.`,
      },
      { status: 402 }
    );
  }

  try {
    const { task, dueDate } = await req.json();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `
You are XFunction AI.

You help students with executive functioning.

Break the following task into 5-10 small actionable steps.

Rules:
- One step per line
- Keep steps short
- No introductions
- No explanations
- Focus on helping students get started

Task:
${task}

Due Date:
${dueDate}
`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    return Response.json({ response: text });
  } catch (error) {
    console.error("Task breakdown failed:", error);
    return Response.json({ error: "Failed to generate task breakdown" }, { status: 500 });
  }
}
