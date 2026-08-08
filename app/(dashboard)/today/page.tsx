import { getCachedUser, createClient } from "../../../lib/supabase/server";
import { mockCourses } from "../../../lib/mock-canvas-data";
import { getAssignmentsDueToday } from "../../../lib/upcoming-assignments";
import { TodayContent, type TodayClassBlock, type TodayPlannedTask } from "../../../components/TodayContent";

const text = "var(--text)";
const textDim = "var(--text-dim)";

interface StoredStudyPlan {
  days?: { date?: string; tasks?: string[] }[];
}

// Server component — pulls together everything relevant to today
// (due-today assignments, today's class schedule, today's planned study
// tasks) in one fetch, so the Today page never needs its own
// fetch-on-mount round trips for data that's already known server-side.
// The one thing that's genuinely on-demand is the AI coach insight (see
// TodayContent) — that one costs a monthly AI generation, so it's not
// auto-fetched just from visiting this page.
export default async function TodayPage() {
  const user = await getCachedUser();

  const todayDate = new Date();
  const todayStr = todayDate.toISOString().slice(0, 10);
  const todayWeekday = todayDate.getDay();

  let classesToday: TodayClassBlock[] = [];
  let plannedToday: TodayPlannedTask[] = [];

  if (user) {
    const supabase = await createClient();
    const [blocksResult, plansResult] = await Promise.all([
      supabase
        .from("course_schedule_blocks")
        .select("id, course_id, day_of_week, start_time, end_time")
        .eq("day_of_week", todayWeekday)
        .order("start_time", { ascending: true }),
      supabase.from("study_plans").select("course_id, plan"),
    ]);

    if (blocksResult.error) console.error(blocksResult.error);
    classesToday = (blocksResult.data ?? []).map((b) => ({
      id: b.id,
      courseId: b.course_id,
      startTime: b.start_time,
      endTime: b.end_time,
    }));

    if (plansResult.error) console.error(plansResult.error);
    plannedToday = (plansResult.data ?? [])
      .map((row) => {
        const plan = row.plan as StoredStudyPlan | null;
        const day = plan?.days?.find((d) => d.date === todayStr);
        if (!day || !day.tasks || day.tasks.length === 0) return null;
        return { courseId: row.course_id as string, tasks: day.tasks };
      })
      .filter((x): x is TodayPlannedTask => x !== null);
  }

  const dueToday = getAssignmentsDueToday();

  const courses = Object.values(mockCourses).map((c) => ({ id: c.id, name: c.name }));

  const dateLabel = todayDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="xf-page-enter"
      style={{
        minHeight: "100vh",
        color: text,
        fontFamily: "Inter, sans-serif",
        padding: "48px 40px",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 8,
            color: textDim,
            fontSize: 13,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          XFunction · Today
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em", color: text }}>
          {dateLabel}
        </h1>
        <p style={{ color: textDim, marginBottom: 24, fontSize: 15 }}>
          Everything relevant to today, in one place — due dates, classes, planned study, and your coach.
        </p>

        <TodayContent
          courses={courses}
          dueToday={dueToday.map((a) => ({
            courseId: a.courseId,
            assignmentName: a.assignmentName,
            courseName: a.courseName,
          }))}
          classesToday={classesToday}
          plannedToday={plannedToday}
        />
      </div>
    </div>
  );
}
