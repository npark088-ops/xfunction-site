import { getCachedUser, createClient } from "../../../lib/supabase/server";
import { mockCourses } from "../../../lib/mock-canvas-data";
import { ScheduleGrid, type ScheduleBlock } from "../../../components/ScheduleGrid";

const text = "var(--text)";
const textDim = "var(--text-dim)";

// Server component — the student's saved schedule blocks are fetched
// here so ScheduleGrid (client) renders with the real week already
// filled in on first paint, no fetch-on-mount flash.
export default async function SchedulePage() {
  const user = await getCachedUser();

  let initialBlocks: ScheduleBlock[] = [];
  if (user) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_schedule_blocks")
      .select("id, course_id, day_of_week, start_time, end_time")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) console.error(error);
    initialBlocks = data ?? [];
  }

  const courses = Object.values(mockCourses).map((c) => ({ id: c.id, name: c.name }));

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
          xFunction · Schedule
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em", color: text }}>
          Weekly schedule
        </h1>
        <p style={{ color: textDim, marginBottom: 24, fontSize: 15 }}>
          Canvas doesn&apos;t provide class meeting times, so this is yours to fill in — add each
          class&apos;s day and time below and it&apos;ll lay out on the grid.
        </p>

        <ScheduleGrid courses={courses} initialBlocks={initialBlocks} />
      </div>
    </div>
  );
}
