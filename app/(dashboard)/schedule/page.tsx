import { getCachedUser, createClient } from "../../../lib/supabase/server";
import { getUserCourses } from "../../../lib/user-courses";
import { ScheduleGrid, type ScheduleBlock } from "../../../components/ScheduleGrid";
import type { StudySession } from "../../../lib/study-sessions";

const text = "var(--text)";
const textDim = "var(--text-dim)";

// Server component — the student's saved schedule blocks are fetched
// here so ScheduleGrid (client) renders with the real week already
// filled in on first paint, no fetch-on-mount flash.
export default async function SchedulePage() {
  const user = await getCachedUser();

  let initialBlocks: ScheduleBlock[] = [];
  let initialSessions: StudySession[] = [];
  let courses: { id: string; name: string }[] = [];
  let assignmentsDue: { courseId: string; courseName: string; name: string; dueAt: string }[] = [];
  if (user) {
    const supabase = await createClient();
    const [blocksResult, sessionsResult, userCourses] = await Promise.all([
      supabase
        .from("course_schedule_blocks")
        .select("id, course_id, day_of_week, start_time, end_time")
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true }),
      // Capped rather than unbounded — plenty for the calendar views and
      // the Study Stats trend chart (12 weeks), while keeping this query
      // cheap regardless of how long an account has been logging sessions.
      supabase
        .from("study_sessions")
        .select("id, course_id, duration_minutes, occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(500),
      getUserCourses(supabase, user.id),
    ]);
    if (blocksResult.error) console.error(blocksResult.error);
    if (sessionsResult.error) console.error(sessionsResult.error);
    initialBlocks = blocksResult.data ?? [];
    initialSessions = sessionsResult.data ?? [];
    courses = Object.values(userCourses).map((c) => ({ id: c.id, name: c.name }));
    assignmentsDue = Object.values(userCourses).flatMap((c) =>
      c.assignmentGroups.flatMap((g) =>
        g.assignments
          .filter((a) => a.due_at)
          .map((a) => ({ courseId: c.id, courseName: c.name, name: a.name, dueAt: a.due_at as string }))
      )
    );
  }

  return (
    <div
      className="xf-page-enter xf-dashboard-page"
      style={{
        minHeight: "100vh",
        color: text,
        fontFamily: "Inter, sans-serif",
        padding: "48px 40px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 8,
            color: textDim,
            fontSize: 13,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          XFunction · Schedule
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em", color: text }}>
          Schedule
        </h1>
        <p style={{ color: textDim, marginBottom: 24, fontSize: 15 }}>
          Canvas doesn&apos;t provide class meeting times, so this is yours to fill in — add each
          class&apos;s day and time below and it&apos;ll lay out on the grid.
        </p>

        <ScheduleGrid
          courses={courses}
          initialBlocks={initialBlocks}
          initialSessions={initialSessions}
          assignmentsDue={assignmentsDue}
        />
      </div>
    </div>
  );
}
