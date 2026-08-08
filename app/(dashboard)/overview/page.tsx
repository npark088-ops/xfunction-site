"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, Mail, MessageSquareText, CalendarRange, Megaphone, Timer } from "lucide-react";
import { mockCourses, getCreditHours } from "../../../lib/mock-canvas-data";
import { getAllAnnouncements } from "../../../lib/mock-announcements";
import { calculateCurrentGrade, calculateWeightedOverallGrade } from "../../../lib/grade-calculator";
import { Gauge, gradeColor } from "../../../components/Gauge";
import { getOverallGradeHistory, trendDirection } from "../../../lib/grade-history";
import { TrendChart } from "../../../components/TrendChart";
import { getUpcomingAssignments, URGENT_WITHIN_DAYS } from "../../../lib/upcoming-assignments";
import { UpgradePrompt } from "../../../components/UpgradePrompt";
import { StreakBadge } from "../../../components/StreakBadge";
import { DemoDataBadge } from "../../../components/DemoDataBadge";
import { createClient } from "../../../lib/supabase/client";
import { getWeekBounds, minutesByCourse, totalMinutes, formatDuration, type StudySession } from "../../../lib/study-sessions";
import { courseColor } from "../../../lib/course-colors";

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

function timeAgo(iso: string): string {
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / (60 * 60 * 1000)));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
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

  // Simulated Canvas announcements feed — see lib/mock-announcements.ts
  // for why this is hand-authored rather than fetched.
  const announcements = getAllAnnouncements().slice(0, 6);

  const [hoveredReminder, setHoveredReminder] = useState<number | null>(null);

  // This week's logged focus-timer sessions (see lib/study-sessions.ts
  // and supabase/migrations/0018_study_sessions.sql) — fetched
  // client-side like the rest of this page's per-user data, since the
  // whole Overview page is already a client component.
  const [weekSessions, setWeekSessions] = useState<StudySession[] | null>(null);
  useEffect(() => {
    const { start, end } = getWeekBounds(new Date());
    const supabase = createClient();
    supabase
      .from("study_sessions")
      .select("id, course_id, duration_minutes, occurred_at")
      .gte("occurred_at", start.toISOString())
      .lt("occurred_at", end.toISOString())
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load this week's study sessions:", error);
          return;
        }
        setWeekSessions(data ?? []);
      });
  }, []);
  const weekStudyMinutes = weekSessions ? totalMinutes(weekSessions) : 0;
  const weekStudyByCourse = weekSessions ? minutesByCourse(weekSessions) : [];

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

  // Combined study plan across every course at once — see
  // app/api/bulk-study-plan, which reuses the same AI-usage gating and
  // per-day JSON shape as the per-course study plan on the Grades page,
  // just built from every course's upcoming items instead of one target
  // assignment. Not persisted — regenerates on demand, same as the
  // study guide/practice quiz on the Grades page.
  const [bulkPlan, setBulkPlan] = useState<{
    days: { date: string; label: string; tasks: string[] }[];
    itemCount: number;
    windowDays: number;
  } | null>(null);
  const [bulkPlanLoading, setBulkPlanLoading] = useState(false);
  const [bulkPlanError, setBulkPlanError] = useState<{ kind: "error" | "upgrade"; message: string } | null>(
    null
  );

  const generateBulkPlan = () => {
    setBulkPlanLoading(true);
    setBulkPlanError(null);
    fetch("/api/bulk-study-plan", { method: "POST" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, status: res.status, data })))
      .then(({ ok, status, data }) => {
        if (!ok) {
          setBulkPlanError({
            kind: status === 402 ? "upgrade" : "error",
            message: data.message || data.error || "Failed to generate combined study plan",
          });
          return;
        }
        setBulkPlan(data);
      })
      .catch(() => setBulkPlanError({ kind: "error", message: "Failed to generate combined study plan" }))
      .finally(() => setBulkPlanLoading(false));
  };

  // Auto-generate on load — meant to feel like a quick check-in that's
  // just there, not another feature you have to remember to click.
  // coachLoading already starts `true`, so nothing needs to be reset
  // synchronously here — this just kicks off the fetch.
  useEffect(() => {
    loadCoachInsight();
  }, []);

  // Re-derives "what notifications should exist right now" (achievement
  // unlocks + urgent deadlines) once per visit to the dashboard, instead
  // of on every single navigation (see lib/activity-notifications.ts and
  // app/(dashboard)/layout.tsx, which now only does cheap reads). Fire
  // and forget — the bell already renders from the server-seeded
  // snapshot, so this doesn't need to block or update anything here;
  // any new notification just shows up next time the snapshot is read.
  useEffect(() => {
    fetch("/api/notifications/sync", { method: "POST" }).catch(() => {});
  }, []);

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
        {/* HEADER */}
        <div style={{ marginBottom: 8, color: textDim, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          XFunction · Overview
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
          <h1 style={{ fontSize: 34, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: text }}>
            Welcome back
          </h1>
          <DemoDataBadge />
        </div>
        <p style={{ color: textDim, marginBottom: 24, fontSize: 15 }}>
          Sample data for preview — Canvas sync isn&apos;t live yet.
        </p>

        <div>
          <StreakBadge />
        </div>

        {/* OVERALL GRADE */}
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
              Weighted by credit hours across {courses.map((c) => c.name).join(", ")} ({totalCredits} total credits)
            </div>
          </div>
        </div>

        {/* OVERALL GRADE TREND */}
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
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                fontWeight: 700,
                color: overallTrend === "up" ? green : overallTrend === "down" ? red : textDim,
              }}
            >
              {overallTrend === "up" ? (
                <TrendingUp size={15} strokeWidth={2.5} />
              ) : overallTrend === "down" ? (
                <TrendingDown size={15} strokeWidth={2.5} />
              ) : (
                <Minus size={15} strokeWidth={2.5} />
              )}
              {overallTrend === "up" ? "Improving" : overallTrend === "down" ? "Declining" : "Steady"}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: textDim,
              marginBottom: 18,
            }}
          >
            <AlertTriangle size={13} strokeWidth={2} />
            Simulated historical data — real Canvas grade history isn&apos;t connected yet.
          </div>
          <TrendChart points={overallGradeHistory} />
        </div>

        {/* THIS WEEK'S STUDY TIME */}
        <div
          className="xf-card"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: textDim,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <Timer size={14} strokeWidth={2} />
              This week&apos;s study time
            </div>
            <Link href="/schedule" style={{ fontSize: 12, fontWeight: 600, color: blue, textDecoration: "none" }}>
              View full stats →
            </Link>
          </div>

          {weekSessions === null ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="xf-skeleton" style={{ height: 28, width: "40%" }} />
              <div className="xf-skeleton" style={{ height: 14, width: "70%" }} />
            </div>
          ) : weekStudyMinutes === 0 ? (
            <div style={{ fontSize: 14, color: textDim }}>
              No focus sessions logged yet this week — start one from a study plan step on any course&apos;s
              Grades page.
            </div>
          ) : (
            <>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 28,
                  fontWeight: 700,
                  color: text,
                  marginBottom: 14,
                }}
              >
                {formatDuration(weekStudyMinutes)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {weekStudyByCourse.map((entry) => {
                  const name = mockCourses[entry.courseId]?.name ?? entry.courseId;
                  const share = weekStudyMinutes > 0 ? (entry.minutes / weekStudyMinutes) * 100 : 0;
                  const color = courseColor(entry.courseId);
                  return (
                    <div key={entry.courseId}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          color: textDim,
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ color: text, fontWeight: 600 }}>{name}</span>
                        <span>{formatDuration(entry.minutes)}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: bg, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.max(share, 4)}%`,
                            background: color,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* AI COACH CHECK-IN */}
        <div
          className="xf-card"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
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
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: textDim,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <Sparkles size={14} strokeWidth={2} />
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
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="xf-skeleton" style={{ height: 14, width: "92%" }} />
              <div className="xf-skeleton" style={{ height: 14, width: "68%" }} />
            </div>
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
          className="xf-card"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
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
            {upcoming.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={sendReminderEmail}
                  disabled={reminderStatus?.kind === "sending"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "transparent",
                    border: `1px solid ${red}`,
                    color: red,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: reminderStatus?.kind === "sending" ? "default" : "pointer",
                  }}
                >
                  <Mail size={13} strokeWidth={2} />
                  {reminderStatus?.kind === "sending" ? "Sending…" : "Email me these reminders"}
                </button>
                <button
                  onClick={sendReminderSms}
                  disabled={smsStatus?.kind === "sending"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "transparent",
                    border: `1px solid ${blue}`,
                    color: blue,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: smsStatus?.kind === "sending" ? "default" : "pointer",
                  }}
                >
                  <MessageSquareText size={13} strokeWidth={2} />
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
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: blue, marginBottom: 2 }}>
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: courseColor(item.courseId),
                            display: "inline-block",
                            flexShrink: 0,
                          }}
                        />
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

        {/* CLASS ANNOUNCEMENTS */}
        <div
          className="xf-card"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
            padding: 20,
            marginTop: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: announcements.length > 0 ? 14 : 0 }}>
            <Megaphone size={15} strokeWidth={2} color={blue} />
            <div style={{ fontSize: 14, fontWeight: 600, color: text }}>Class announcements</div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: textDim,
              marginBottom: announcements.length > 0 ? 12 : 0,
            }}
          >
            <AlertTriangle size={12} strokeWidth={2} />
            Simulated — a preview of what a real Canvas-connected feed will show here.
          </div>
          {announcements.length === 0 ? (
            <div style={{ fontSize: 13, color: textDim }}>No announcements right now.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {announcements.map((a) => (
                <Link
                  key={`${a.courseId}-${a.id}`}
                  href={`/grades/${a.courseId}`}
                  style={{
                    display: "block",
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: bg,
                    border: `1px solid ${border}`,
                    textDecoration: "none",
                    color: text,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                    <div style={{ fontSize: 12, color: blue, fontWeight: 600 }}>
                      {a.courseName} · {a.author}
                    </div>
                    <div style={{ fontSize: 11, color: textDim, whiteSpace: "nowrap" }}>{timeAgo(a.postedAt)}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, color: text }}>{a.title}</div>
                  <div style={{ fontSize: 13, color: textDim, lineHeight: 1.5 }}>{a.body}</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* COMBINED STUDY PLAN */}
        <div
          className="xf-card"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
            padding: 24,
            marginTop: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: textDim,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            <CalendarRange size={14} strokeWidth={2} />
            Combined study plan
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 600, marginTop: 0, marginBottom: 6, color: text }}>
            One plan for everything coming up
          </h2>
          <p style={{ fontSize: 13, color: textDim, marginBottom: bulkPlan ? 20 : 18, lineHeight: 1.5 }}>
            Instead of a separate plan per assignment, generate a single day-by-day plan across all your
            courses&apos; upcoming tests and assignments — prioritized by what&apos;s due soonest and what&apos;s
            worth the most toward your grade.
          </p>

          {!bulkPlan && (
            <button
              onClick={generateBulkPlan}
              disabled={bulkPlanLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 20px",
                borderRadius: "var(--radius-sm)",
                background: blue,
                color: "white",
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                cursor: bulkPlanLoading ? "default" : "pointer",
                opacity: bulkPlanLoading ? 0.7 : 1,
              }}
            >
              <Sparkles size={15} strokeWidth={2} />
              {bulkPlanLoading ? "Generating…" : "Generate combined study plan"}
            </button>
          )}

          {bulkPlanError?.kind === "upgrade" && (
            <div style={{ marginTop: 12 }}>
              <UpgradePrompt message={bulkPlanError.message} />
            </div>
          )}
          {bulkPlanError?.kind === "error" && (
            <div style={{ color: red, fontSize: 13, marginTop: 12 }}>{bulkPlanError.message}</div>
          )}

          {bulkPlan && (
            <>
              <p style={{ color: textDim, fontSize: 14, marginBottom: 24 }}>
                {bulkPlan.days.length}-day plan covering {bulkPlan.itemCount} upcoming item
                {bulkPlan.itemCount === 1 ? "" : "s"} across your courses.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {bulkPlan.days.map((day) => (
                  <div
                    key={day.date}
                    style={{
                      background: bg,
                      border: `1px solid ${border}`,
                      borderRadius: "var(--radius-md)",
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 13,
                        fontWeight: 600,
                        color: blue,
                        marginBottom: 10,
                      }}
                    >
                      {day.label}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                      {day.tasks.map((t, i) => (
                        <li key={i} style={{ fontSize: 14, lineHeight: 1.5, color: text }}>
                          • {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <button
                onClick={generateBulkPlan}
                disabled={bulkPlanLoading}
                style={{
                  marginTop: 20,
                  padding: "10px 18px",
                  borderRadius: "var(--radius-sm)",
                  background: "transparent",
                  color: blue,
                  border: `1px solid ${border}`,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: bulkPlanLoading ? "default" : "pointer",
                }}
              >
                {bulkPlanLoading ? "Regenerating…" : "Regenerate plan"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
