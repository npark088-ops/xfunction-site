import Anthropic from "@anthropic-ai/sdk";
import { mockCourses } from "../../../lib/mock-canvas-data";
import { createClient } from "../../../lib/supabase/server";
import { consumeAiGeneration } from "../../../lib/ai-usage";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Estimates are batched into ONE model call per course (not one per
// assignment) — otherwise just opening the Assignments tab could burn
// through several assignments' worth of a student's monthly AI quota
// in a single click. See lib/ai-usage.ts.
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

  const { courseId } = await req.json();
  const course = mockCourses[courseId];
  if (!course) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  const assignments = course.assignmentGroups.flatMap((group) =>
    group.assignments.map((a) => ({
      id: a.id,
      name: a.name,
      groupName: group.name,
      points: a.points_possible,
    }))
  );

  if (assignments.length === 0) {
    return Response.json({ error: "No assignments found for this course" }, { status: 404 });
  }

  const listSummary = assignments
    .map((a) => `id ${a.id}: "${a.name}" (${a.groupName} category, ${a.points} pts)`)
    .join("\n");

  const prompt = `
You are XFunction AI, estimating how long a typical high school student would realistically take to complete each assignment below. No assignment description text is available in this system — infer scope from the assignment's title, its category (e.g. "Homework" vs "Quizzes" vs "Tests" vs "Essays"), and its point value, which is often a rough signal of scope.

Course: ${course.name}

Assignments:
${listSummary}

For each assignment, estimate a realistic completion time in minutes (a whole number, e.g. 20, 45, 90) — how long it typically actually takes a student in practice, including re-reading instructions and checking work, not a theoretical minimum. For Tests/Quizzes, estimate the actual sit-down/testing time, not time spent studying beforehand.

Respond with ONLY valid JSON, no markdown fences, no explanation, in exactly this shape:
{"estimates": [{"id": 101, "minutes": 25}, ...]}
The "estimates" array must have exactly one entry per assignment id listed above.
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim().replace(/^```(json)?/, "").replace(/```$/, ""));

    if (!Array.isArray(parsed.estimates)) {
      throw new Error("Model returned an unexpected shape");
    }

    const estimates = parsed.estimates
      .filter((e: unknown): e is { id: unknown; minutes: unknown } => typeof e === "object" && e !== null)
      .map((e: { id: unknown; minutes: unknown }) => ({
        id: Number(e.id),
        minutes: Math.max(1, Math.round(Number(e.minutes))),
      }))
      .filter((e: { id: number; minutes: number }) => Number.isFinite(e.id) && Number.isFinite(e.minutes));

    return Response.json({ estimates });
  } catch (error) {
    console.error("Time estimate generation failed:", error);
    return Response.json({ error: "Failed to estimate time" }, { status: 500 });
  }
}
