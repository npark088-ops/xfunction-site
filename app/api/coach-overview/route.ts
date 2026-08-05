import Anthropic from "@anthropic-ai/sdk";
import { mockCourses } from "../../../lib/mock-canvas-data";
import { calculateCategoryBreakdown, calculateCurrentGrade } from "../../../lib/grade-calculator";
import { createClient } from "../../../lib/supabase/server";
import { consumeAiGeneration } from "../../../lib/ai-usage";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function GET() {
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

  const courseSummaries = Object.values(mockCourses)
    .map((course) => {
      const grade = calculateCurrentGrade(course.assignmentGroups);
      const breakdown = calculateCategoryBreakdown(course.assignmentGroups);
      const breakdownText = breakdown
        .map(
          (c) =>
            `${c.name} ${c.percentage !== null ? `${Math.round(c.percentage)}%` : "no grades yet"} (${c.weight}% of grade)`
        )
        .join(", ");
      return `- ${course.name}: ${grade.toFixed(1)}% overall. ${breakdownText}`;
    })
    .join("\n");

  const prompt = `
You are xFunction AI, giving a student a quick, specific coaching check-in based on their real current grades. Not generic encouragement — say something concrete and grounded in the numbers below.

Courses:
${courseSummaries}

Write a short check-in (2-4 sentences, plain text) that:
1. Names which ONE course needs the most attention right now, and briefly why — reference the actual weakest category/number pulling that grade down.
2. Gives ONE concrete, specific thing to focus on this week (not vague advice like "study more").

Rules:
- Be direct and specific — reference real grade numbers and category names from above
- No greeting, no sign-off, no filler like "Hey there!" or "Great job so far!" — just the insight
- No markdown formatting (no **, no bullet points, no headers)
- Respond with ONLY the check-in text, nothing else
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    return Response.json({ insight: text.trim() });
  } catch (error) {
    console.error("Coach overview generation failed:", error);
    return Response.json({ error: "Failed to generate check-in" }, { status: 500 });
  }
}
