import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { mockCourses, getCreditHours } from "../../../lib/mock-canvas-data";
import { calculateCurrentGrade, calculateCategoryBreakdown } from "../../../lib/grade-calculator";
import { letterGradeFor } from "../../../lib/grading-scale";
import { gradeColor } from "../../../components/Gauge";
import { getCourseGradeHistory, trendDirection } from "../../../lib/grade-history";
import { DemoDataBadge } from "../../../components/DemoDataBadge";
import { courseColor } from "../../../lib/course-colors";

const card = "var(--card)";
const border = "var(--border)";
const text = "var(--text)";
const textDim = "var(--text-dim)";
const green = "var(--green)";
const red = "var(--red)";

// Server component — same "sync computation over mock data" pattern as
// the Courses page, just reshaped so every course's key numbers sit
// side by side instead of requiring a click into each one.
export default function ComparePage() {
  const courses = Object.values(mockCourses).map((course) => {
    const grade = calculateCurrentGrade(course.assignmentGroups);
    const breakdown = calculateCategoryBreakdown(course.assignmentGroups);
    const history = getCourseGradeHistory(course.id, grade);
    return {
      id: course.id,
      name: course.name,
      creditHours: getCreditHours(course),
      grade,
      letter: letterGradeFor(grade, course.gradingScale),
      trend: trendDirection(history),
      breakdown,
    };
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
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 8,
            color: textDim,
            fontSize: 13,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          XFunction · Compare
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
          <h1 style={{ fontSize: 34, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: text }}>
            Compare courses
          </h1>
          <DemoDataBadge />
        </div>
        <p style={{ color: textDim, marginBottom: 28, fontSize: 15 }}>
          All your courses side by side, so you can spot what needs attention at a glance.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/grades/${c.id}`}
              className="xf-card xf-card-hover"
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 0.9fr 0.7fr 1.6fr",
                gap: 24,
                alignItems: "center",
                background: card,
                border: `1px solid ${border}`,
                borderLeft: `4px solid ${courseColor(c.id)}`,
                borderRadius: "var(--radius-lg)",
                padding: "22px 28px",
                textDecoration: "none",
                color: text,
              }}
            >
              {/* Course name */}
              <div>
                <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 600, margin: 0, marginBottom: 4, color: text }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: courseColor(c.id),
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  {c.name}
                </h2>
                <div style={{ fontSize: 12, color: textDim }}>
                  {c.creditHours} credit{c.creditHours === 1 ? "" : "s"}
                </div>
              </div>

              {/* Current grade */}
              <div>
                <div style={{ fontSize: 12, color: textDim, marginBottom: 2 }}>Current grade</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 22,
                      fontWeight: 600,
                      color: gradeColor(c.grade),
                    }}
                  >
                    {c.grade.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: textDim }}>{c.letter}</div>
                </div>
              </div>

              {/* Trend */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 13,
                  fontWeight: 700,
                  color: c.trend === "up" ? green : c.trend === "down" ? red : textDim,
                }}
              >
                {c.trend === "up" ? (
                  <TrendingUp size={15} strokeWidth={2.5} />
                ) : c.trend === "down" ? (
                  <TrendingDown size={15} strokeWidth={2.5} />
                ) : (
                  <Minus size={15} strokeWidth={2.5} />
                )}
                {c.trend === "up" ? "Improving" : c.trend === "down" ? "Declining" : "Steady"}
              </div>

              {/* Category breakdown */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                {c.breakdown.map((cat) => (
                  <div key={cat.groupId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <span style={{ width: 70, flexShrink: 0, color: textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cat.name}
                    </span>
                    <div style={{ flex: 1, height: 5, background: border, borderRadius: 3, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${cat.percentage ?? 0}%`,
                          height: "100%",
                          background: cat.percentage !== null ? gradeColor(cat.percentage) : border,
                        }}
                      />
                    </div>
                    <span style={{ width: 34, textAlign: "right", flexShrink: 0, fontFamily: "'IBM Plex Mono', monospace", color: text }}>
                      {cat.percentage !== null ? `${Math.round(cat.percentage)}%` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
