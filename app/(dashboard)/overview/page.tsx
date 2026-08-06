"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mockCourses, getCreditHours } from "../../../lib/mock-canvas-data";
import { calculateCurrentGrade, calculateWeightedOverallGrade } from "../../../lib/grade-calculator";
import { Gauge, gradeColor } from "../../../components/Gauge";
import { getOverallGradeHistory, trendDirection } from "../../../lib/grade-history";
import { TrendChart } from "../../../components/TrendChart";
import { getUpcomingAssignments, URGENT_WITHIN_DAYS } from "../../../lib/upcoming-assignments";
import { UpgradePrompt } from "../../../components/UpgradePrompt";
import { StreakBadge } from "../../../components/StreakBadge";

const bg = "var(--bg)";
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

export default function OverviewPage() {
  const courses = Object.values(mockCourses).map((course) => ({
    id: course.id,
    name: course.name,
    grade: calculateCurrentGrade(course.assignmentGroups),
    creditHours: getCreditHours(course),
  }));

  // Weighted by each course's credit hours (an AP/Honors course
  // carrying 1.5 credits pulls the overall grade more than a
  // 1.0-credit course) instead of a plain average across courses.
  const overallGrade = calculateWeightedOverallGrade(courses);
  const totalCredits = courses.reduce((sum, c) => sum + c.creditHours, 0);

  const overallGradeHistory = getOverallGradeHistory(overallGrade);
  const overallTrend = trendDirection(overallGradeHistory);

  // Ungraded assignments due within the next 7 days, across all courses.
  const upcoming = getUpcomingAssignments(7);

  const [hoveredReminder, setHoveredReminder] = useState<number | null>(null);

  const [coachInsight, setCoachInsight] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);
  const [coachError, setCoachError] = useState<{ kind: "error" | "upgrade"; message: string } | null>(
    null
  );

  // Only ever called from a promise continuation or an event handler
  // (never synchronously from an effect body), so it's fine to update
  // state here directly.
  const loadCoachInsight = () => {
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

  const refreshCoachInsight = () => {
    setCoachLoading(true);
    setCoachError(null);
    loadCoachInsight();
  };

  const [reminderStatus, setReminderStatus] = useState<
    { kind: "sending" } | { kind: "sent"; count: number } | { kind: "error"; message: string } | null
  >(null);

  const sendReminderEmail = () => {
    setReminderStatus({ kind: "sending" });
    fetch("/api/send-reminders", { method: "POST" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setReminderStatus({ kind: "error", message: data.error || "Failed to send email" });
          return;
        }
        setReminderStatus({ kind: "sent", count: data.count });
      })
      .catch(() => setReminderStatus({ kind: "error", message: "Failed to send email" }));
  };

  const [smsStatus, setSmsStatus] = useState<
    { kind: "sending" } | { kind: "sent"; count: number } | { kind: "error"; message: string } | null
  >(null);

  const sendReminderSms = () => {
    setSmsStatus({ kind: "sending" });
    fetch("/api/send-reminders-sms", { method: "POST" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setSmsStatus({ kind: "error", message: data.error || "Failed to send text" });
          return;
        }
        setSmsStatus({ kind: "sent", count: data.count });
      })
      .catch(() => setSmsStatus({ kind: "error", message: "Failed to send text" }));
  };

  // Auto-generate on load — meant to feel like a quick check-in that's
  // just there, not another feature you have to remember to click.
  // coachLoading already starts `true`, so nothing needs to be reset
  // synchronously here — this just kicks off the fetch.
  useEffect(() => {
    loadCoachInsight();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        color: text,
        fontFamily: "Inter, sans-serif",
        padding: "48px 40px",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {/* HEADER */}
        <div style={{ marginBottom: 8, color: textDim, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          xFunction · Overview
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em", color: text }}>
          Welcome back
        </h1>
        <p style={{ color: textDim, marginBottom: 24, fontSize: 15 }}>
          Linked from Canvas · updated just now
        </p>

        <div>
          <StreakBadge />
        </div>

        {/* OVERALL GRADE */}
        <div
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 16,
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
              Weighted by credit hours across {courses.map((c) => c.name).join(", ")} ({totalCredits} total credits)
            </div>
          </div>
        </div>

        {/* OVERALL GRADE TREND */}
        <div
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 28,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: text }}>Overall grade trend</h2>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: overallTrend === "up" ? green : overallTrend === "down" ? red : textDim,
              }}
            >
              {overallTrend === "up"
                ? "↑ Improving"
                : overallTrend === "down"
                  ? "↓ Declining"
                  : "→ Steady"}
            </div>
          </div>
          <div style={{ fontSize: 12, color: textDim, marginBottom: 18 }}>
            ⚠ Simulated historical data — real Canvas grade history isn&apos;t connected yet.
          </div>
          <TrendChart points={overallGradeHistory} />
        </div>

        {/* AI COACH CHECK-IN */}
        <div
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: textDim,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Coach check-in
            </div>
            {!coachLoading && (coachInsight || coachError) && (
              <button
                onClick={refreshCoachInsight}
                style={{
                  background: "none",
                  border: "none",
                  color: blue,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Refresh
              </button>
            )}
          </div>

          {coachLoading && (
            <div style={{ fontSize: 14, color: textDim }}>Looking at your grades…</div>
          )}
          {!coachLoading && coachError?.kind === "upgrade" && (
            <UpgradePrompt message={coachError.message} />
          )}
          {!coachLoading && coachError?.kind === "error" && (
            <div style={{ fontSize: 14, color: red }}>{coachError.message}</div>
          )}
          {!coachLoading && !coachError && coachInsight && (
            <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, color: text }}>{coachInsight}</p>
          )}
        </div>

        {/* COMING UP */}
        <div
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: upcoming.length > 0 ? 14 : 0,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: text }}>Coming up</div>
            {upcoming.some((a) => a.daysAway <= URGENT_WITHIN_DAYS) && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={sendReminderEmail}
                  disabled={reminderStatus?.kind === "sending"}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: "transparent",
                    border: `1px solid ${red}`,
                    color: red,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: reminderStatus?.kind === "sending" ? "default" : "pointer",
                  }}
                >
                  {reminderStatus?.kind === "sending" ? "Sending…" : "Email me these reminders"}
                </button>
                <button
                  onClick={sendReminderSms}
                  disabled={smsStatus?.kind === "sending"}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: "transparent",
                    border: `1px solid ${blue}`,
                    color: blue,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: smsStatus?.kind === "sending" ? "default" : "pointer",
                  }}
                >
                  {smsStatus?.kind === "sending" ? "Sending…" : "Text me these reminders"}
                </button>
              </div>
            )}
          </div>
          {reminderStatus?.kind === "sent" && (
            <div style={{ fontSize: 12, color: green, marginBottom: 12 }}>
              Sent — {reminderStatus.count} urgent item{reminderStatus.count === 1 ? "" : "s"} emailed to you.
            </div>
          )}
          {reminderStatus?.kind === "error" && (
            <div style={{ fontSize: 12, color: red, marginBottom: 12 }}>
              {reminderStatus.message}
            </div>
          )}
          {smsStatus?.kind === "sent" && (
            <div style={{ fontSize: 12, color: green, marginBottom: 12 }}>
              Sent — {smsStatus.count} urgent item{smsStatus.count === 1 ? "" : "s"} texted to you.
            </div>
          )}
          {smsStatus?.kind === "error" && (
            <div style={{ fontSize: 12, color: red, marginBottom: 12 }}>
              {smsStatus.message}
            </div>
          )}
          {upcoming.length === 0 ? (
            <div style={{ fontSize: 13, color: textDim }}>Nothing due in the next 7 days.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {upcoming.map((item, i) => {
                const urgent = item.daysAway <= URGENT_WITHIN_DAYS;
                const hovered = hoveredReminder === i;
                return (
                  <Link
                    key={i}
                    href={`/grades/${item.courseId}`}
                    onMouseEnter={() => setHoveredReminder(i)}
                    onMouseLeave={() => setHoveredReminder(null)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: urgent
                        ? hovered
                          ? "rgba(241, 101, 101, 0.12)"
                          : "rgba(241, 101, 101, 0.06)"
                        : hovered
                          ? "#EEF2F7"
                          : bg,
                      border: `1px solid ${urgent ? red : hovered ? blue : border}`,
                      textDecoration: "none",
                      color: text,
                      cursor: "pointer",
                      transform: hovered ? "translateY(-2px)" : "translateY(0)",
                      transition: "transform 0.15s ease, border-color 0.15s ease, background 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: blue, marginBottom: 2 }}>
                        {item.courseName}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.assignmentName}</div>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: urgent ? red : textDim,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {daysAwayLabel(item.daysAway)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
