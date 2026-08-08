import Anthropic from "@anthropic-ai/sdk";
import { mockCourses } from "../../../lib/mock-canvas-data";
import { findTargetAssignment, relevantContextAssignmentNames } from "../../../lib/study-target";
import { createClient } from "../../../lib/supabase/server";
import { consumeAiGeneration } from "../../../lib/ai-usage";
import { captureServerEvent } from "../../../lib/posthog-server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 10;

// Same target-assignment logic as the study guide route, so a quiz and
// a study guide generated back-to-back for the same course are always
// testing the same material — see lib/study-target.ts.
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

  const target = findTargetAssignment(course.assignmentGroups);
  if (!target) {
    return Response.json(
      { error: "No upcoming assignments found for this course" },
      { status: 404 }
    );
  }

  const contextAssignmentNames = relevantContextAssignmentNames(course.assignmentGroups, target);

  const prompt = `
You are XFunction AI, writing a short practice quiz to help a student prepare for a specific upcoming test or assignment.

Course: ${course.name}
Assignment to study for: "${target.assignment.name}" (${target.group.name} category)
Assignments covered since the last test, in this same unit, for grounded context: ${contextAssignmentNames.join(", ")}

Your #1 priority: base every question on what "${target.assignment.name}" is SPECIFICALLY about, not the course in general. The assignment's own title is the strongest signal of its scope — if it names a specific topic (e.g. "Quiz 2: Genetics" means genetics — inheritance, Punnett squares, DNA replication, mutations — NOT general cell biology), write ONLY about that topic. If the name itself gives no topic hint (e.g. a generically-named "Unit 2 Test"), use the assignment names listed above to determine the topics. Do not reach for generic intro-level topics from earlier in the course.

Write a practice quiz of ${MIN_QUESTIONS}-${MAX_QUESTIONS} short questions covering the material most likely to be tested on THIS assignment specifically.

Rules:
- Mix of question types (short answer, "explain why", small calculations, applying a concept to a new example) — not all the same format
- Each question should be answerable in a sentence or two, or a short calculation — not an essay prompt
- Each answer should be a concise, correct, specific model answer (1-3 sentences, or a worked calculation), not a vague summary
- Be concrete and accurate to the real subject matter for this specific assignment
- Respond with ONLY valid JSON, no markdown fences, no explanation, in exactly this shape:
{"questions": [{"question": "...", "answer": "..."}, ...]}
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1800,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim().replace(/^```(json)?/, "").replace(/```$/, ""));

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error("Model returned an unexpected shape");
    }

    const questions = parsed.questions
      .filter((q: unknown): q is { question: unknown; answer: unknown } => typeof q === "object" && q !== null)
      .map((q: { question: unknown; answer: unknown }) => ({
        question: String(q.question ?? ""),
        answer: String(q.answer ?? ""),
      }));

    captureServerEvent(user.id, "ai_feature_used", { feature: "practice_quiz" });

    return Response.json({
      courseName: course.name,
      targetAssignment: target.assignment.name,
      targetGroup: target.group.name,
      questions,
    });
  } catch (error) {
    console.error("Practice quiz generation failed:", error);
    return Response.json({ error: "Failed to generate practice quiz" }, { status: 500 });
  }
}
