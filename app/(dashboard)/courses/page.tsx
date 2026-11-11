import Link from "next/link";
import { getCreditHours, hasDemoCourses, type MockCourse } from "../../../lib/mock-canvas-data";
import { getUserCourses } from "../../../lib/user-courses";
import { calculateCurrentGrade } from "../../../lib/grade-calculator";
import { letterGradeFor } from "../../../lib/grading-scale";
import { gradeColor } from "../../../components/Gauge";
import { getCachedUser, createClient } from "../../../lib/supabase/server";
import { getCanvasConnection } from "../../../lib/canvas-token-store";
import { getGoogleClassroomConnection } from "../../../lib/google-classroom-token-store";
import { getSchoologyConnection } from "../../../lib/schoology-token-store";
import { getMoodleConnection } from "../../../lib/moodle-token-store";
import { getBlackboardConnection } from "../../../lib/blackboard-token-store";
import { PlatformConnectionsCard } from "../../../components/PlatformConnectionsCard";
import { PlatformId, PlatformPreference } from "../../../lib/platforms";
import { DemoDataBadge } from "../../../components/DemoDataBadge";
import { AddCourseCard } from "../../../components/AddCourseCard";
import { courseColor } from "../../../lib/course-colors";

const card = "var(--card)";
const border = "var(--border)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

type Banner = { platform: PlatformId; message: string; kind: "success" | "error" } | null;

// Each platform keeps its OWN query param (canvas=, gclassroom=,
// schoology=, moodle=, blackboard=) rather than a single shared one —
// Canvas's param and callback route are untouched from before this
// multi-platform change, so nothing about its existing behavior shifts.
function bannerFor(params: {
  canvas?: string;
  gclassroom?: string;
  schoology?: string;
  moodle?: string;
  blackboard?: string;
}): Banner {
  if (params.canvas === "connected") return { platform: "canvas", message: "Canvas connected.", kind: "success" };
  if (params.canvas === "denied") return { platform: "canvas", message: "Canvas connection was declined.", kind: "error" };
  if (params.canvas === "error") return { platform: "canvas", message: "Something went wrong connecting Canvas. Please try again.", kind: "error" };

  if (params.gclassroom === "connected") return { platform: "google-classroom", message: "Google Classroom connected.", kind: "success" };
  if (params.gclassroom === "denied") return { platform: "google-classroom", message: "Google Classroom connection was declined.", kind: "error" };
  if (params.gclassroom === "error") return { platform: "google-classroom", message: "Something went wrong connecting Google Classroom. Please try again.", kind: "error" };

  if (params.schoology === "connected") return { platform: "schoology", message: "Schoology connected.", kind: "success" };
  if (params.schoology === "denied") return { platform: "schoology", message: "Schoology connection was declined.", kind: "error" };
  if (params.schoology === "error") return { platform: "schoology", message: "Something went wrong connecting Schoology. Please try again.", kind: "error" };

  if (params.moodle === "connected") return { platform: "moodle", message: "Moodle connected.", kind: "success" };

  if (params.blackboard === "connected") return { platform: "blackboard", message: "Blackboard connected.", kind: "success" };
  if (params.blackboard === "denied") return { platform: "blackboard", message: "Blackboard connection was declined.", kind: "error" };
  if (params.blackboard === "error") return { platform: "blackboard", message: "Something went wrong connecting Blackboard. Please try again.", kind: "error" };

  return null;
}

// Server component — the course list is just a sync computation over
// mock data, and every platform's connection status is looked up
// directly via its token-store's get*Connection() instead of the page
// calling its own /api/{platform}/status routes over HTTP. Only the
// Connect/Disconnect buttons need to be interactive, so that's the one
// piece split out into a client component (PlatformConnectionsCard),
// seeded with these initial statuses instead of fetching them again on
// mount.
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{
    canvas?: string;
    gclassroom?: string;
    schoology?: string;
    moodle?: string;
    blackboard?: string;
  }>;
}) {
  const { canvas, gclassroom, schoology, moodle, blackboard } = await searchParams;
  const banner = bannerFor({ canvas, gclassroom, schoology, moodle, blackboard });

  const user = await getCachedUser();
  let initialStatuses: Partial<
    Record<PlatformId, { connected: boolean; user: { id: string | number; name: string } | null } >
  > = {};

  let userCourses: Record<string, MockCourse> = {};

  let platformPreference: PlatformPreference = null;

  if (user) {
    const supabase = await createClient();
    userCourses = await getUserCourses(supabase, user.id);
    // allSettled, not all — a single platform's lookup failing (e.g. a
    // migration for a newer platform hasn't been run against this
    // Supabase project yet) shouldn't 500 the whole Courses page and
    // take Canvas/everything else down with it. Any rejection just
    // falls back to "not connected" for that one platform.
    const [canvasResult, googleResult, schoologyResult, moodleResult, blackboardResult, profileResult] =
      await Promise.allSettled([
        getCanvasConnection(supabase, user.id),
        getGoogleClassroomConnection(supabase, user.id),
        getSchoologyConnection(supabase, user.id),
        getMoodleConnection(supabase, user.id),
        getBlackboardConnection(supabase, user.id),
        supabase.from("profiles").select("platform_preference").eq("user_id", user.id).maybeSingle(),
      ]);

    platformPreference =
      profileResult.status === "fulfilled" ? profileResult.value.data?.platform_preference ?? null : null;

    for (const result of [canvasResult, googleResult, schoologyResult, moodleResult, blackboardResult]) {
      if (result.status === "rejected") {
        console.error("Platform connection lookup failed:", result.reason);
      }
    }

    const canvasConnection = canvasResult.status === "fulfilled" ? canvasResult.value : null;
    const googleConnection = googleResult.status === "fulfilled" ? googleResult.value : null;
    const schoologyConnection = schoologyResult.status === "fulfilled" ? schoologyResult.value : null;
    const moodleConnection = moodleResult.status === "fulfilled" ? moodleResult.value : null;
    const blackboardConnection = blackboardResult.status === "fulfilled" ? blackboardResult.value : null;

    initialStatuses = {
      canvas: {
        connected: Boolean(canvasConnection),
        user: canvasConnection
          ? { id: canvasConnection.canvas_user_id, name: canvasConnection.canvas_user_name }
          : null,
      },
      "google-classroom": {
        connected: Boolean(googleConnection),
        user: googleConnection
          ? { id: googleConnection.google_user_id, name: googleConnection.google_user_name }
          : null,
      },
      schoology: {
        connected: Boolean(schoologyConnection),
        user: schoologyConnection
          ? {
              id: schoologyConnection.schoology_user_id,
              name: schoologyConnection.schoology_user_name ?? "Schoology user",
            }
          : null,
      },
      moodle: {
        connected: Boolean(moodleConnection),
        user: moodleConnection
          ? { id: moodleConnection.moodle_user_id, name: moodleConnection.moodle_user_name }
          : null,
      },
      blackboard: {
        connected: Boolean(blackboardConnection),
        user: blackboardConnection
          ? { id: blackboardConnection.blackboard_user_id, name: blackboardConnection.blackboard_user_name }
          : null,
      },
    };
  }

  const courses = Object.values(userCourses).map((course) => ({
    id: course.id,
    name: course.name,
    grade: calculateCurrentGrade(course.assignmentGroups),
    creditHours: getCreditHours(course),
    letter: letterGradeFor(calculateCurrentGrade(course.assignmentGroups), course.gradingScale),
  }));
  const showDemoBadge = hasDemoCourses(userCourses);

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
          XFunction · Courses
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
          <h1 style={{ fontSize: 34, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: text }}>
            Your courses
          </h1>
          {showDemoBadge && <DemoDataBadge />}
        </div>
        <p style={{ color: textDim, marginBottom: 24, fontSize: 15 }}>
          Add your real classes and track grades yourself, or connect a platform above to sync automatically.
        </p>

        <PlatformConnectionsCard
          initialStatuses={initialStatuses}
          banner={banner}
          preferredPlatform={platformPreference}
        />

        {/* COURSE CARDS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          <AddCourseCard hasCourses={courses.length > 0} />
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/grades/${c.id}`}
              className="course-card"
              style={{
                display: "block",
                background: card,
                border: `1px solid ${border}`,
                borderLeft: `4px solid ${courseColor(c.id)}`,
                borderRadius: "var(--radius-lg)",
                padding: 24,
                textDecoration: "none",
                color: text,
              }}
            >
              <div style={{ fontSize: 13, color: textDim, marginBottom: 10 }}>
                Course · {c.creditHours} credit{c.creditHours === 1 ? "" : "s"}
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 18, color: text }}>{c.name}</h2>
              <div style={{ fontSize: 13, color: textDim, marginBottom: 2 }}>Current grade</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
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
                <div style={{ fontSize: 15, fontWeight: 600, color: textDim }}>{c.letter}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
