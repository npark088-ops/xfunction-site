import { getCachedUser, createClient } from "../../../lib/supabase/server";
import { getUserCourses } from "../../../lib/user-courses";
import { calculateCurrentGrade } from "../../../lib/grade-calculator";
import { TrendsContent, type CourseSummary } from "../../../components/TrendsContent";
import type { StudySession } from "../../../lib/study-sessions";

const text = "var(--text)";
const textDim = "var(--text-dim)";

// Server component — fetches the student's full study session history
// once (same table/pattern as the Schedule page) so TrendsContent
// (client) can analyze it without a fetch-on-mount flash.
export default async function TrendsPage() {
  const user = await getCachedUser();

  let sessions: StudySession[] = [];
  let courses: CourseSummary[] = [];
  if (user) {
    const supabase = await createClient();
    const [{ data, error }, userCourses] = await Promise.all([
      supabase
        .from("study_sessions")
        .select("id, course_id, duration_minutes, occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(500),
      getUserCourses(supabase, user.id),
    ]);
    if (error) console.error(error);
    sessions = data ?? [];
    courses = Object.values(userCourses).map((c) => ({
      id: c.id,
      name: c.name,
      grade: calculateCurrentGrade(c.assignmentGroups),
    }));
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
          XFunction · Trends
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em", color: text }}>
          Productivity trends
        </h1>
        <p style={{ color: textDim, marginBottom: 24, fontSize: 15 }}>
          Built from your logged focus sessions — when you tend to study, how consistent it&apos;s been, and
          which courses could use more of your time.
        </p>

        <TrendsContent sessions={sessions} courses={courses} />
      </div>
    </div>
  );
}
