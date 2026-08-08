import Anthropic from "@anthropic-ai/sdk";
import { mockCourses } from "../../../lib/mock-canvas-data";
import { calculateCategoryBreakdown, calculateCurrentGrade } from "../../../lib/grade-calculator";
import { findTargetAssignment } from "../../../lib/study-target";
import { createClient } from "../../../lib/supabase/server";
import { consumeAiGeneration } from "../../../lib/ai-usage";
import { markFirstStudyPlanGenerated } from "../../../lib/achievements";
import { captureServerEvent } from "../../../lib/posthog-server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_PLAN_DAYS = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

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

  const currentGrade = calculateCurrentGrade(course.assignmentGroups);
  const breakdown = calculateCategoryBreakdown(course.assignmentGroups);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(target.assignment.due_at ?? today);
  dueDate.setHours(0, 0, 0, 0);

  const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / MS_PER_DAY);
  const numDays = Math.min(Math.max(daysUntilDue, 0) + 1, MAX_PLAN_DAYS);

  // Precompute the actual calendar date/label for each day ourselves —
  // the model only fills in tasks, so it can't get date math wrong.
  const planDates = Array.from({ length: numDays }, (_, i) => {
    const d = new Date(today.getTime() + i * MS_PER_DAY);
    const isToday = i === 0;
    const isDueDate = d.getTime() === dueDate.getTime();
    return {
      date: d.toISOString().slice(0, 10),
      label: `${formatDate(d)}${isToday ? " · Today" : ""}${isDueDate ? " · Due date" : ""}`,
    };
  });

  const breakdownSummary = breakdown
    .map((c) => `${c.name} (${c.weight}% of grade): ${c.percentage !== null ? `${Math.round(c.percentage)}%` : "no grades yet"}`)
    .join("; ");

  const prompt = `
You are XFunction AI, helping a student prepare for an upcoming test or assignment.

Course: ${course.name}
Current overall grade: ${currentGrade.toFixed(1)}%
Grade breakdown by category: ${breakdownSummary}

Upcoming target: "${target.assignment.name}" (${target.group.name} category, worth ${target.assignment.points_possible} points), due ${dueDate.toDateString()}.

Base every task on what "${target.assignment.name}" is SPECIFICALLY about — its title is the strongest signal of scope (e.g. "Quiz 2: Genetics" means genetics tasks, not general course review). Only broaden to the course's general subject matter if the name gives no topic hint at all.

Create a day-by-day study plan with exactly ${numDays} day(s) leading up to and including the due date.

Rules:
- 2-4 small, specific, actionable tasks per day — not vague advice. Bad: "Review material." Good: "Rewrite the Calvin cycle diagram from memory, then check it against your notes."
- Reference real study techniques (practice problems, flashcards, timed self-quizzes, re-doing missed homework, etc.) suited to the category.
- If a grade category is weaker (lower %), weight more tasks toward reinforcing it.
- The last day's tasks should be light review/confidence-building, not new material, since the assignment is due that day.
- Respond with ONLY valid JSON, no markdown fences, no explanation, in exactly this shape:
{"days": [{"day": 1, "tasks": ["...", "..."]}, {"day": 2, "tasks": ["...", "..."]}]}
- The "days" array must have exactly ${numDays} entries, numbered 1 through ${numDays} in order.
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim().replace(/^```(json)?/, "").replace(/```$/, ""));

    if (!Array.isArray(parsed.days) || parsed.days.length !== numDays) {
      throw new Error("Model returned an unexpected shape");
    }

    const days = planDates.map((d, i) => ({
      date: d.date,
      label: d.label,
      tasks: Array.isArray(parsed.days[i]?.tasks) ? parsed.days[i].tasks : [],
    }));

    await markFirstStudyPlanGenerated(supabase, user.id);
    captureServerEvent(user.id, "ai_feature_used", { feature: "study_plan" });

    return Response.json({
      courseName: course.name,
      targetAssignment: target.assignment.name,
      targetGroup: target.group.name,
      targetDueDate: dueDate.toDateString(),
      days,
    });
  } catch (error) {
    console.error("Study plan generation failed:", error);
    return Response.json({ error: "Failed to generate study plan" }, { status: 500 });
  }
}
