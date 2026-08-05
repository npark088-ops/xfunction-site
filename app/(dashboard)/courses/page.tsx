import Link from "next/link";
import { mockCourses } from "../../../lib/mock-canvas-data";
import { calculateCurrentGrade } from "../../../lib/grade-calculator";
import { gradeColor } from "../../../components/Gauge";
import { getCachedUser, createClient } from "../../../lib/supabase/server";
import { getCanvasConnection } from "../../../lib/canvas-token-store";
import { CanvasConnectionCard } from "../../../components/CanvasConnectionCard";

const card = "#141B2E";
const border = "#232C45";
const textDim = "#8B94AC";

function bannerFor(canvas?: string) {
  if (canvas === "connected") return "Canvas connected.";
  if (canvas === "denied") return "Canvas connection was declined.";
  if (canvas === "error") return "Something went wrong connecting Canvas.";
  return null;
}

// Server component — the course list is just a sync computation over
// mock data, and Canvas connection status is looked up directly via
// getCanvasConnection() instead of the page calling its own
// /api/canvas/status route over HTTP. Only the Connect/Disconnect
// button needs to be interactive, so that's the one piece split out
// into a client component (CanvasConnectionCard), seeded with this
// initial status instead of fetching it again on mount.
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ canvas?: string }>;
}) {
  const { canvas } = await searchParams;
  const banner = bannerFor(canvas);

  const courses = Object.values(mockCourses).map((course) => ({
    id: course.id,
    name: course.name,
    grade: calculateCurrentGrade(course.assignmentGroups),
  }));

  const user = await getCachedUser();
  let initialStatus: { connected: boolean; user: { id: number; name: string } | null } = {
    connected: false,
    user: null,
  };

  if (user) {
    const supabase = await createClient();
    const connection = await getCanvasConnection(supabase, user.id);
    initialStatus = {
      connected: Boolean(connection),
      user: connection
        ? { id: connection.canvas_user_id, name: connection.canvas_user_name }
        : null,
    };
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "white",
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
          xFunction · Courses
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>
          Your courses
        </h1>
        <p style={{ color: textDim, marginBottom: 24, fontSize: 15 }}>
          Linked from Canvas · updated just now
        </p>

        <CanvasConnectionCard initialStatus={initialStatus} banner={banner} />

        {/* COURSE CARDS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/grades/${c.id}`}
              style={{
                display: "block",
                background: card,
                border: `1px solid ${border}`,
                borderRadius: 16,
                padding: 24,
                textDecoration: "none",
                color: "white",
              }}
            >
              <div style={{ fontSize: 13, color: textDim, marginBottom: 10 }}>Course</div>
              <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 18 }}>{c.name}</h2>
              <div style={{ fontSize: 13, color: textDim, marginBottom: 2 }}>Current grade</div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 26,
                  fontWeight: 600,
                  color: gradeColor(c.grade),
                }}
              >
                {c.grade.toFixed(1)}%
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
