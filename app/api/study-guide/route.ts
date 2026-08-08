import Anthropic from "@anthropic-ai/sdk";
import { mockCourses } from "../../../lib/mock-canvas-data";
import { findTargetAssignment, relevantContextAssignmentNames } from "../../../lib/study-target";
import { createClient } from "../../../lib/supabase/server";
import { consumeAiGeneration } from "../../../lib/ai-usage";
import { captureServerEvent } from "../../../lib/posthog-server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

  // Only assignments due since the last test (a natural unit boundary),
  // not the whole course's history — otherwise older material dilutes
  // the signal and the model defaults to generic intro-level topics.
  // See lib/study-target.ts.
  const contextAssignmentNames = relevantContextAssignmentNames(course.assignmentGroups, target);

  const prompt = `
You are XFunction AI, helping a student study for a specific upcoming test or assignment.

Course: ${course.name}
Assignment to study for: "${target.assignment.name}" (${target.group.name} category)
Assignments covered since the last test, in this same unit, for grounded context: ${contextAssignmentNames.join(", ")}

Your #1 priority: build the study guide around what "${target.assignment.name}" is SPECIFICALLY about, not the course in general. The assignment's own title is the strongest signal of its scope — if it names a specific topic (e.g. "Quiz 2: Genetics" means genetics — inheritance, Punnett squares, DNA replication, mutations — NOT general cell biology), cover ONLY that topic in depth. If the name itself gives no topic hint (e.g. a generically-named "Unit 2 Test"), use the assignment names listed above — since they're specifically this unit's material — to determine the topics. Do not reach for generic intro-level topics from earlier in the course; those assignments were deliberately excluded from the list above because they belong to a prior unit.

Write a study guide covering the key concepts most likely to be tested on THIS assignment specifically.

Rules:
- 3-6 topic sections, ordered logically (e.g. the order concepts build on each other)
- Each topic needs a short, specific title (2-6 words) — not just a single vocabulary term
- Each topic's explanation should be 2-4 sentences that actually teach the concept, not a definition dump or a list of terms
- Be concrete and accurate to the real subject matter for this specific assignment
- Respond with ONLY valid JSON, no markdown fences, no explanation, in exactly this shape:
{"topics": [{"title": "...", "explanation": "..."}, ...]}
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim().replace(/^```(json)?/, "").replace(/```$/, ""));

    if (!Array.isArray(parsed.topics) || parsed.topics.length === 0) {
      throw new Error("Model returned an unexpected shape");
    }

    const topics = parsed.topics
      .filter((t: unknown): t is { title: unknown; explanation: unknown } => typeof t === "object" && t !== null)
      .map((t: { title: unknown; explanation: unknown }) => ({
        title: String(t.title ?? ""),
        explanation: String(t.explanation ?? ""),
      }));

    captureServerEvent(user.id, "ai_feature_used", { feature: "study_guide" });

    return Response.json({
      courseName: course.name,
      targetAssignment: target.assignment.name,
      targetGroup: target.group.name,
      topics,
    });
  } catch (error) {
    console.error("Study guide generation failed:", error);
    return Response.json({ error: "Failed to generate study guide" }, { status: 500 });
  }
}
