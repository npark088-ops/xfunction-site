"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck, Clock, ListChecks, Sparkles, CheckCircle2 } from "lucide-react";
import { formatTime12h } from "./ScheduleGrid";
import { courseColor } from "../lib/course-colors";
import { UpgradePrompt } from "./UpgradePrompt";

const card = "var(--card)";
const border = "var(--border)";
const bg = "var(--bg)";
const blue = "var(--blue)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

const cardStyle = {
  background: card,
  border: `1px solid ${border}`,
  borderRadius: "var(--radius-lg)",
  padding: 24,
  marginBottom: 24,
};

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: textDim,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  marginBottom: 14,
};

export interface TodayDueItem {
  courseId: string;
  courseName: string;
  assignmentName: string;
}

export interface TodayClassBlock {
  id: string;
  courseId: string;
  startTime: string;
  endTime: string;
}

export interface TodayPlannedTask {
  courseId: string;
  tasks: string[];
}

function CourseDot({ courseId }: { courseId: string }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: courseColor(courseId),
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

export function TodayContent({
  courses,
  dueToday,
  classesToday,
  plannedToday,
}: {
  courses: { id: string; name: string }[];
  dueToday: TodayDueItem[];
  classesToday: TodayClassBlock[];
  plannedToday: TodayPlannedTask[];
}) {
  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? id;

  const [coachInsight, setCoachInsight] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<{ kind: "error" | "upgrade"; message: string } | null>(
    null
  );

  const loadCoachInsight = () => {
    setCoachLoading(true);
    setCoachError(null);
    fetch("/api/coach-overview")
      .then((res) => res.json().then((data) => ({ ok: res.ok, status: res.status, data })))
      .then(({ ok, status, data }) => {
        if (!ok) {
          setCoachError({
            kind: status === 402 ? "upgrade" : "error",
            message: data.message || data.error || "Failed to generate check-in",
          });
          return;
        }
        setCoachInsight(data.insight);
      })
      .catch(() => setCoachError({ kind: "error", message: "Failed to generate check-in" }))
      .finally(() => setCoachLoading(false));
  };

  return (
    <>
      {/* DUE TODAY */}
      <div className="xf-card" style={cardStyle}>
        <div style={sectionHeader}>
          <CalendarCheck size={14} strokeWidth={2} />
          Due today
        </div>
        {dueToday.length === 0 ? (
          <div style={{ fontSize: 14, color: textDim }}>Nothing due today. 🎉</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dueToday.map((item, i) => (
              <Link
                key={i}
                href={`/grades/${item.courseId}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  background: bg,
                  border: `1px solid ${border}`,
                  textDecoration: "none",
                  color: text,
                }}
              >
                <CourseDot courseId={item.courseId} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: textDim }}>{item.courseName}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.assignmentName}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* TODAY'S CLASSES */}
      <div className="xf-card" style={cardStyle}>
        <div style={sectionHeader}>
          <Clock size={14} strokeWidth={2} />
          Today&apos;s classes
        </div>
        {classesToday.length === 0 ? (
          <div style={{ fontSize: 14, color: textDim }}>
            No classes on today&apos;s schedule.{" "}
            <Link href="/schedule" style={{ color: blue, fontWeight: 600 }}>
              Add your class times
            </Link>
            .
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {classesToday.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  background: bg,
                  border: `1px solid ${border}`,
                }}
              >
                <CourseDot courseId={c.courseId} />
                <div style={{ fontSize: 14, fontWeight: 600, color: text, flex: 1 }}>{courseName(c.courseId)}</div>
                <div style={{ fontSize: 13, color: textDim, whiteSpace: "nowrap" }}>
                  {formatTime12h(c.startTime)}–{formatTime12h(c.endTime)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PLANNED STUDY TODAY */}
      <div className="xf-card" style={cardStyle}>
        <div style={sectionHeader}>
          <ListChecks size={14} strokeWidth={2} />
          Planned study today
        </div>
        {plannedToday.length === 0 ? (
          <div style={{ fontSize: 14, color: textDim }}>
            No study plan has tasks scheduled for today — generate one from any course&apos;s Grades page.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {plannedToday.map((p) => (
              <div key={p.courseId}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <CourseDot courseId={p.courseId} />
                  <Link
                    href={`/grades/${p.courseId}`}
                    style={{ fontSize: 13, fontWeight: 700, color: text, textDecoration: "none" }}
                  >
                    {courseName(p.courseId)}
                  </Link>
                </div>
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                  {p.tasks.map((t, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: text, lineHeight: 1.5 }}>
                      <CheckCircle2 size={15} strokeWidth={2} color={textDim} style={{ flexShrink: 0, marginTop: 2 }} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* COACH'S TOP INSIGHT */}
      <div className="xf-card" style={{ ...cardStyle, marginBottom: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={sectionHeader}>
            <Sparkles size={14} strokeWidth={2} />
            Coach&apos;s top insight
          </div>
          {!coachLoading && (coachInsight || coachError) && (
            <button
              onClick={loadCoachInsight}
              style={{ background: "none", border: "none", color: blue, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}
            >
              Refresh
            </button>
          )}
        </div>

        {!coachLoading && !coachInsight && !coachError && (
          <>
            <p style={{ fontSize: 13, color: textDim, marginTop: 0, marginBottom: 14 }}>
              Uses one of your monthly AI generations — generate it here when you want it, rather than
              automatically every time you visit.
            </p>
            <button
              onClick={loadCoachInsight}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: "var(--radius-sm)",
                background: blue,
                color: "white",
                border: "none",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Sparkles size={14} strokeWidth={2} />
              Get today&apos;s insight
            </button>
          </>
        )}

        {coachLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="xf-skeleton" style={{ height: 14, width: "92%" }} />
            <div className="xf-skeleton" style={{ height: 14, width: "68%" }} />
          </div>
        )}
        {!coachLoading && coachError?.kind === "upgrade" && <UpgradePrompt message={coachError.message} />}
        {!coachLoading && coachError?.kind === "error" && (
          <div style={{ fontSize: 14, color: "var(--red)" }}>{coachError.message}</div>
        )}
        {!coachLoading && !coachError && coachInsight && (
          <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, color: text }}>{coachInsight}</p>
        )}
      </div>
    </>
  );
}
