import Link from "next/link";
import { getCachedUser, createClient } from "../../lib/supabase/server";
import { URGENT_WITHIN_DAYS } from "../../lib/upcoming-assignments";
import { getParentSummary } from "../../lib/parent-server";
import { calendarDaysBetween, localDate } from "../../lib/local-date";
import { LeaveLinkButton } from "../../components/LeaveLinkButton";
import { Gauge, gradeColor } from "../../components/Gauge";
import { TrendChart } from "../../components/TrendChart";
import { Users, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { getRequestTimeZone } from "../../lib/request-tz";

const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const green = "var(--green)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

function daysAwayLabel(daysAway: number) {
  if (daysAway <= 0) return "Due today";
  if (daysAway === 1) return "Due tomorrow";
  return `Due in ${daysAway} days`;
}

export default async function ParentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student: selectedStudentId } = await searchParams;
  const user = await getCachedUser();

  // Only links where the signed-in user is the PARENT. (A student who has
  // parents linked must not see their own links listed here as "students".)
  let linkedStudents: { id: string; student_id: string; student_email: string }[] = [];
  if (user) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("parent_links")
      .select("id, student_id, student_email")
      .eq("parent_id", user.id)
      .eq("status", "active")
      .order("accepted_at", { ascending: true });
    if (error) console.error(error);
    linkedStudents = data ?? [];
  }

  if (linkedStudents.length === 0) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
        <Users size={32} strokeWidth={1.5} color={textDim} style={{ marginBottom: 14 }} />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: text, marginBottom: 8 }}>
          No students have shared access with you yet
        </h1>
        <p style={{ fontSize: 14, color: textDim, lineHeight: 1.6 }}>
          Ask the student to go to Settings → Parent access in their XFunction account and send
          you an invite link.
        </p>
      </div>
    );
  }

  const active =
    linkedStudents.find((s) => s.student_id === selectedStudentId) ?? linkedStudents[0];

  // Parents have NO direct database access to a student's courses, categories or
  // assignments. getParentSummary (lib/parent-server.ts) first checks, from this
  // parent's own session, that an ACTIVE link to this student exists, then reads
  // with the admin client and returns only: overall grade and trend, per-class
  // grade, and upcoming work (title, class, due date). No scores, notes, tasks,
  // goals, study sessions, schedule, plans, chat, settings or notifications.
  const supabase = await createClient();
  const timeZone = await getRequestTimeZone();
  const summary = await getParentSummary(supabase, active.student_id, timeZone);

  if (!summary) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: text, marginBottom: 8 }}>
          This view isn&apos;t available right now
        </h1>
        <p style={{ fontSize: 14, color: textDim, lineHeight: 1.6 }}>
          Please try again in a moment. If it keeps happening, ask the student to send a new invite.
        </p>
      </div>
    );
  }

  const { overallGrade, trend, courses } = summary;
  const overallGradeHistory = summary.history;
  const todayStr = localDate(timeZone);
  const upcoming = summary.upcoming.map((u) => ({
    ...u,
    daysAway: u.dueDate ? Math.max(0, calendarDaysBetween(todayStr, u.dueDate)) : 7,
  }));

  return (
    <div className="xf-page-enter" style={{ maxWidth: 820, margin: "0 auto", padding: "40px 40px 64px" }}>
      {linkedStudents.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {linkedStudents.map((s) => (
            <Link
              key={s.student_id}
              href={`/parent?student=${s.student_id}`}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                color: s.student_id === active.student_id ? "white" : text,
                background: s.student_id === active.student_id ? blue : card,
                border: `1px solid ${s.student_id === active.student_id ? blue : border}`,
              }}
            >
              {s.student_email}
            </Link>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 8, color: textDim, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        Read-only progress view
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 20, letterSpacing: "-0.02em", color: text }}>
        {active.student_email}
      </h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: textDim,
          background: card,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-sm)",
          padding: "10px 14px",
          marginBottom: 24,
        }}
      >
        <Info size={14} strokeWidth={2} />
        You have read-only access: overall grade, each class&apos;s grade and what&apos;s due soon. Individual scores,
        notes and everything else stay private to the student.
      </div>

      <div style={{ marginBottom: 24 }}>
        <LeaveLinkButton linkId={active.id} studentLabel={active.student_email} />
      </div>

      {/* Overall grade */}
      <div
        className="xf-card"
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-lg)",
          padding: 28,
          marginBottom: 24,
          display: "flex",
          gap: 28,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Gauge percentage={overallGrade} size={100} />
        <div>
          <div style={{ fontSize: 13, color: textDim, marginBottom: 2 }}>
            Overall grade · {courses.length} courses
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 32,
              fontWeight: 700,
              color: gradeColor(overallGrade),
              marginBottom: 6,
            }}
          >
            {overallGrade.toFixed(1)}%
          </div>
          <div style={{ fontSize: 13, color: textDim }}>
            {courses.map((c) => `${c.name} (${c.grade.toFixed(1)}%)`).join(" · ")}
          </div>
        </div>
      </div>

      {/* Trend */}
      <div
        className="xf-card"
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-lg)",
          padding: 28,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: text }}>Grade trend</h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 13,
              fontWeight: 700,
              color: trend === "up" ? green : trend === "down" ? red : textDim,
            }}
          >
            {trend === "up" ? (
              <TrendingUp size={15} strokeWidth={2.5} />
            ) : trend === "down" ? (
              <TrendingDown size={15} strokeWidth={2.5} />
            ) : (
              <Minus size={15} strokeWidth={2.5} />
            )}
            {trend === "up" ? "Improving" : trend === "down" ? "Declining" : "Steady"}
          </div>
        </div>
        <div style={{ fontSize: 12, color: textDim, marginBottom: 18 }}>
          ⚠ Simulated historical data — real Canvas grade history isn&apos;t connected yet.
        </div>
        <TrendChart points={overallGradeHistory} />
      </div>

      {/* Upcoming deadlines */}
      <div
        className="xf-card"
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-lg)",
          padding: 20,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: upcoming.length > 0 ? 14 : 0 }}>
          Coming up
        </div>
        {upcoming.length === 0 ? (
          <div style={{ fontSize: 13, color: textDim }}>Nothing due in the next 7 days.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map((item, i) => {
              const urgent = item.daysAway <= URGENT_WITHIN_DAYS;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: urgent ? "rgba(241, 101, 101, 0.06)" : "var(--bg)",
                    border: `1px solid ${urgent ? red : border}`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: blue, marginBottom: 2 }}>{item.course}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: text }}>{item.title}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: urgent ? red : textDim, whiteSpace: "nowrap" }}>
                    {daysAwayLabel(item.daysAway)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
