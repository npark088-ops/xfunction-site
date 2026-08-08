import Anthropic from "@anthropic-ai/sdk";
import { mockCourses } from "../../../lib/mock-canvas-data";
import { calculateCategoryBreakdown } from "../../../lib/grade-calculator";
import { getUpcomingAssignments } from "../../../lib/upcoming-assignments";
import { createClient } from "../../../lib/supabase/server";
import { consumeAiGeneration } from "../../../lib/ai-usage";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const WINDOW_DAYS = 14;
const MIN_PLAN_DAYS = 7;
const MAX_PLAN_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// One combined plan across every course, instead of the per-course
// study-plan route's single target assignment — see app/api/study-plan
// for that version. Reuses the same AI-usage gating and JSON-plan
// shape so the client can render both with the same UI.
export async function POST() {
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

  const upcoming = getUpcomingAssignments(WINDOW_DAYS);
  if (upcoming.length === 0) {
    return Response.json(
      { error: "Nothing due in the next two weeks — no plan needed yet." },
      { status: 404 }
    );
  }

  // Cross-reference each upcoming item with its assignment group so the
  // model can weigh urgency (daysAway) against impact (category weight%
  // and how weak that category already is), not just due-date order.
  const items = upcoming.map((item) => {
    const course = mockCourses[item.courseId];
    const group = course?.assignmentGroups.find((g) =>
      g.assignments.some((a) => a.id === item.assignmentId)
    );
    const assignment = group?.assignments.find((a) => a.id === item.assignmentId);
    const breakdown = group ? calculateCategoryBreakdown([group])[0] : null;
    return {
      ...item,
      groupName: group?.name ?? "Assignments",
      weight: group?.group_weight ?? 0,
      points: assignment?.points_possible ?? 0,
      categoryPercentage: breakdown?.percentage ?? null,
    };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const furthestDaysAway = Math.max(...items.map((i) => i.daysAway));
  const numDays = Math.min(Math.max(furthestDaysAway, MIN_PLAN_DAYS), MAX_PLAN_DAYS);

  // Precompute calendar dates ourselves, same reason as the per-course
  // route — the model only fills in tasks, so date math can't drift.
  const planDates = Array.from({ length: numDays }, (_, i) => {
    const d = new Date(today.getTime() + i * MS_PER_DAY);
    return {
      date: d.toISOString().slice(0, 10),
      label: `${formatDate(d)}${i === 0 ? " · Today" : ""}`,
    };
  });

  const itemsSummary = [...items]
    .sort((a, b) => a.daysAway - b.daysAway)
    .map(
      (i) =>
        `"${i.assignmentName}" — ${i.courseName}, ${i.groupName} category (${i.weight}% of course grade, ${i.points} pts), due in ${i.daysAway} day(s). Category currently at ${
          i.categoryPercentage !== null ? `${Math.round(i.categoryPercentage)}%` : "no grades yet"
        }.`
    )
    .join("\n");

  const prompt = `
You are XFunction AI, building ONE combined study plan for a student juggling multiple courses at once.

Upcoming tests/assignments across all their courses, in the next ${WINDOW_DAYS} days:
${itemsSummary}

Create a single day-by-day plan spanning exactly ${numDays} day(s) starting today that helps the student prepare for ALL of the above, sensibly prioritized:
- Items due soonest should get attention earliest.
- Items worth more of the course grade (higher weight%) or whose category is already weak deserve more tasks.
- Spread tasks across days rather than cramming everything into one day — a few focused tasks per day, not a huge list.
- Every task must name which course/assignment it's for, e.g. "AP Biology: Rewrite the Calvin cycle diagram from memory" — never a vague task with no course attached.
- Once an item's due date has passed within the plan, stop scheduling tasks for it.

Rules:
- 2-4 tasks per day, specific and actionable — not vague advice.
- Reference real study techniques (practice problems, flashcards, timed self-quizzes, re-doing missed homework) suited to each category.
- Respond with ONLY valid JSON, no markdown fences, no explanation, in exactly this shape:
{"days": [{"day": 1, "tasks": ["...", "..."]}, {"day": 2, "tasks": ["...", "..."]}]}
- The "days" array must have exactly ${numDays} entries, numbered 1 through ${numDays} in order.
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
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

    return Response.json({ days, itemCount: items.length, windowDays: WINDOW_DAYS });
  } catch (error) {
    console.error("Bulk study plan generation failed:", error);
    return Response.json({ error: "Failed to generate combined study plan" }, { status: 500 });
  }
}
