"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus, Sparkles, Mail, CalendarRange, Megaphone, Timer, ArrowRight } from "lucide-react";
import { Gauge, gradeColor } from "./Gauge";
import { TrendChart } from "./TrendChart";
import { UpgradePrompt } from "./UpgradePrompt";
import { StreakBadge } from "./StreakBadge";
import { DemoDataBadge } from "./DemoDataBadge";
import { courseColor } from "../lib/course-colors";
import { formatDuration } from "../lib/study-sessions";
import { URGENT_WITHIN_DAYS, type UpcomingAssignment } from "../lib/upcoming-assignments";
import type { Announcement } from "../lib/mock-announcements";
import type { GradePoint } from "../lib/grade-history";

// The signed-in dashboard's layout. It only draws what it is handed: the
// data loading, the AI/reminder requests and their state all stay in
// app/(dashboard)/overview/page.tsx. Styles: the "Dashboard screen" block in
// app/app.css (.dash*).
//
// Reading order is the priority order: what's due next (the one dominant
// card), then two small stat cards, then the coach note, the study plan,
// what else is coming up and the class feed. Detail that most visits don't
// need (the trend chart, per-course study time, reminder buttons, longer
// lists) sits behind a native "Show more" disclosure; nothing was removed.

export type RequestStatus =
  | { kind: "sending" }
  | { kind: "sent"; count: number }
  | { kind: "error"; message: string }
  | null;

export type AiError = { kind: "error" | "upgrade"; message: string } | null;

export type BulkPlan = {
  days: { date: string; label: string; tasks: string[] }[];
  itemCount: number;
  windowDays: number;
};

export type OverviewViewProps = {
  loaded: boolean;
  isDemo: boolean;
  courses: { id: string; name: string; grade: number; creditHours: number }[];
  overallGrade: number;
  totalCredits: number;
  trend: "up" | "down" | "steady";
  trendPoints: GradePoint[];
  upcoming: UpcomingAssignment[];
  announcements: Announcement[];
  studyLoaded: boolean;
  studyMinutes: number;
  studyByCourse: { courseId: string; name: string; minutes: number }[];
  coach: { loading: boolean; insight: string | null; error: AiError };
  email: { status: RequestStatus; onSend: () => void };
  plan: { data: BulkPlan | null; loading: boolean; error: AiError; onGenerate: () => void };
};

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

// "Show more" — a native <details>, so it is keyboard- and screen-reader-
// accessible. With `lazy` the contents are only mounted once opened, which
// the Chart.js trend chart needs (it can't size itself while hidden).
function ShowMore({
  label,
  openLabel = "Show less",
  lazy = false,
  children,
}: {
  label: string;
  openLabel?: string;
  lazy?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details className="dash-more" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{open ? openLabel : label}</summary>
      <div className="dash-more__body">{lazy ? (open ? children : null) : children}</div>
    </details>
  );
}

function StatusLine({ status, noun, verb }: { status: RequestStatus; noun: string; verb: string }) {
  if (status?.kind === "sent") {
    return (
      <p className="dash-status dash-status--ok" role="status">
        Sent — {status.count} urgent item{status.count === 1 ? "" : "s"} {verb} to you.
      </p>
    );
  }
  if (status?.kind === "error") {
    return (
      <p className="dash-status dash-status--err" role="alert">
        {status.message || `Failed to send ${noun}`}
      </p>
    );
  }
  return null;
}

function UpcomingRow({ item }: { item: UpcomingAssignment }) {
  const urgent = item.daysAway <= URGENT_WITHIN_DAYS;
  return (
    <li>
      <Link href={`/grades/${item.courseId}`} className="dash-row">
        <div className="dash-row__main">
          <p className="dash-row__course">
            <span className="dash-dot" style={{ background: courseColor(item.courseId) }} aria-hidden="true" />
            {item.courseName}
          </p>
          <p className="dash-row__title">{item.assignmentName}</p>
        </div>
        <span className={`dash-row__when${urgent ? " is-urgent" : ""}`}>{daysAwayLabel(item.daysAway)}</span>
      </Link>
    </li>
  );
}

export function OverviewView(p: OverviewViewProps) {
  const [coachOpen, setCoachOpen] = useState(false);
  const next = p.upcoming[0];
  const restUpcoming = p.upcoming.slice(1);
  const hasCourses = p.courses.length > 0;
  const trendColor = p.trend === "up" ? "var(--green)" : p.trend === "down" ? "var(--red)" : "var(--text-dim)";
  const TrendIcon = p.trend === "up" ? TrendingUp : p.trend === "down" ? TrendingDown : Minus;
  const trendLabel = p.trend === "up" ? "Improving" : p.trend === "down" ? "Declining" : "Steady";

  return (
    <div className="dash">
      {/* HEADER */}
      <header className="dash__head">
        <div>
          <h1 className="dash__title">
            Welcome back
            {p.loaded && p.isDemo && <DemoDataBadge />}
          </h1>
          <p className="dash__sub">Here&apos;s what&apos;s next.</p>
        </div>
        <StreakBadge />
      </header>

      {/* NEXT UP — the one dominant card */}
      {!p.loaded ? (
        <section className="dash-hero" aria-busy="true" aria-label="Loading what's next">
          <div className="xf-skeleton" style={{ height: 12, width: 80, opacity: 0.35 }} />
          <div className="xf-skeleton" style={{ height: 28, width: "60%", marginTop: 14, opacity: 0.35 }} />
          <div className="xf-skeleton" style={{ height: 44, width: 140, marginTop: 20, opacity: 0.35 }} />
        </section>
      ) : !hasCourses ? (
        <section className="xf-surface dash-card dash-empty">
          <h2>No classes yet</h2>
          <p>Add a class on the Courses page to see your grade and what&apos;s due here.</p>
          <Link href="/courses" className="xf-btn">
            Go to Courses
          </Link>
        </section>
      ) : next ? (
        <section className="dash-hero" aria-labelledby="dash-next-title">
          <p className="xf-eyebrow">Next up</p>
          <h2 id="dash-next-title">{next.assignmentName}</h2>
          <p className="dash-hero__course">
            <span className="dash-dot" style={{ background: courseColor(next.courseId) }} aria-hidden="true" />
            {next.courseName}
          </p>
          <div className="dash-hero__row">
            <span className={`xf-chip${next.daysAway <= URGENT_WITHIN_DAYS ? " xf-chip--urgent" : ""}`}>
              {daysAwayLabel(next.daysAway)}
            </span>
            <Link href={`/grades/${next.courseId}`} className="xf-btn">
              Open course
              <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
            </Link>
            <Link href="/today" className="xf-link">
              See today&apos;s plan
            </Link>
          </div>
        </section>
      ) : (
        <section className="dash-hero" aria-labelledby="dash-next-title">
          <p className="xf-eyebrow">Next up</p>
          <h2 id="dash-next-title">You&apos;re all caught up</h2>
          <p className="dash-hero__empty">Nothing is due in the next 7 days. A good time to get ahead.</p>
          <div className="dash-hero__row">
            <Link href="/today" className="xf-btn">
              See today&apos;s plan
              <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      {/* STAT CARDS */}
      <div className="dash-stats" style={{ alignItems: "start" }}>
        {hasCourses && (
          <section className="xf-surface dash-stat" aria-label="Overall grade">
            <div className="dash-stat__top">
              <Gauge percentage={p.overallGrade} size={72} />
              <div>
                <p className="xf-eyebrow">Overall grade</p>
                <p className="dash-stat__value" style={{ color: gradeColor(p.overallGrade) }}>
                  {p.overallGrade.toFixed(1)}%
                </p>
                <span className="dash-trend" style={{ color: trendColor }}>
                  <TrendIcon size={15} strokeWidth={2.5} aria-hidden="true" />
                  {trendLabel}
                </span>
              </div>
            </div>
            <ShowMore label="Show trend and details" lazy>
              <TrendChart points={p.trendPoints} />
              <p className="dash-note">
                {p.isDemo
                  ? "Simulated historical data — real grade history builds up over time."
                  : "Trend builds up as your grades change over time."}
              </p>
              <p className="dash-note">
                {p.courses.length} course{p.courses.length === 1 ? "" : "s"}, weighted by credit hours (
                {p.totalCredits} total): {p.courses.map((c) => c.name).join(", ")}.
              </p>
            </ShowMore>
          </section>
        )}

        <section className="xf-surface dash-stat" aria-label="Study time this week">
          <p className="xf-eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Timer size={14} strokeWidth={2} aria-hidden="true" />
            Study this week
          </p>
          {!p.studyLoaded ? (
            <div style={{ marginTop: 10 }}>
              <div className="xf-skeleton" style={{ height: 30, width: "45%" }} />
              <div className="xf-skeleton" style={{ height: 14, width: "75%", marginTop: 10 }} />
            </div>
          ) : p.studyMinutes === 0 ? (
            <>
              <p className="dash-stat__value">0m</p>
              <p className="dash-stat__note">Start a focus session from a course&apos;s study plan.</p>
            </>
          ) : (
            <>
              <p className="dash-stat__value">{formatDuration(p.studyMinutes)}</p>
              <ShowMore label="Show by course">
                <ul className="dash-bars">
                  {p.studyByCourse.map((entry) => {
                    const share = (entry.minutes / p.studyMinutes) * 100;
                    return (
                      <li key={entry.courseId}>
                        <div className="dash-bar__label">
                          <span>{entry.name}</span>
                          <span>{formatDuration(entry.minutes)}</span>
                        </div>
                        <div className="dash-bar__track" aria-hidden="true">
                          <div
                            className="dash-bar__fill"
                            style={{ width: `${Math.max(share, 4)}%`, background: courseColor(entry.courseId) }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ShowMore>
            </>
          )}
          <p className="dash-note" style={{ marginTop: 10 }}>
            <Link href="/schedule" className="xf-link">
              View full stats →
            </Link>
          </p>
        </section>
      </div>

      {/* COACH CHECK-IN */}
      <section className="xf-surface dash-card" aria-labelledby="dash-coach-title">
        <div className="dash-card__head">
          <h2 id="dash-coach-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} strokeWidth={2} aria-hidden="true" style={{ color: "var(--blue)" }} />
            Coach check-in
          </h2>
        </div>
        <div className="dash-card__body">
          {p.coach.loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-busy="true">
              <div className="xf-skeleton" style={{ height: 14, width: "92%" }} />
              <div className="xf-skeleton" style={{ height: 14, width: "68%" }} />
            </div>
          )}
          {!p.coach.loading && p.coach.error?.kind === "upgrade" && <UpgradePrompt message={p.coach.error.message} />}
          {!p.coach.loading && p.coach.error?.kind === "error" && (
            <p className="dash-status dash-status--err" style={{ margin: 0 }}>
              {p.coach.error.message}
            </p>
          )}
          {!p.coach.loading && !p.coach.error && p.coach.insight && (
            <>
              <p className={`dash-text${coachOpen ? "" : " dash-clamp"}`}>{p.coach.insight}</p>
              {p.coach.insight.length > 150 && (
                <button type="button" className="xf-link" style={{ marginTop: 6, minHeight: 40 }} onClick={() => setCoachOpen((v) => !v)}>
                  {coachOpen ? "Show less" : "Read more"}
                </button>
              )}
            </>
          )}
          {!p.coach.loading && !p.coach.error && !p.coach.insight && (
            <p className="dash-card__lead" style={{ margin: 0 }}>
              Add a class on the Courses page and your daily check-in will show up here. It refreshes once a day.
            </p>
          )}
        </div>
      </section>

      {/* STUDY PLAN */}
      <section className="xf-surface dash-card" aria-labelledby="dash-plan-title">
        <h2 id="dash-plan-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CalendarRange size={18} strokeWidth={2} aria-hidden="true" style={{ color: "var(--blue)" }} />
          Plan my week
        </h2>
        <p className="dash-card__lead">One day-by-day plan for everything coming up, soonest and biggest first.</p>

        {!p.plan.data && (
          <div className="dash-card__body">
            <button type="button" className="xf-btn" onClick={p.plan.onGenerate} disabled={p.plan.loading}>
              <Sparkles size={16} strokeWidth={2} aria-hidden="true" />
              {p.plan.loading ? "Generating…" : "Generate study plan"}
            </button>
          </div>
        )}

        {p.plan.error?.kind === "upgrade" && (
          <div className="dash-card__body">
            <UpgradePrompt message={p.plan.error.message} />
          </div>
        )}
        {p.plan.error?.kind === "error" && (
          <p className="dash-status dash-status--err" role="alert">
            {p.plan.error.message}
          </p>
        )}

        {p.plan.data && (
          <>
            <p className="dash-note">
              {p.plan.data.days.length}-day plan covering {p.plan.data.itemCount} upcoming item
              {p.plan.data.itemCount === 1 ? "" : "s"}.
            </p>
            <ol className="dash-list">
              {p.plan.data.days.slice(0, 2).map((day) => (
                <li key={day.date} className="dash-plan-day">
                  <h3>{day.label}</h3>
                  <ul>
                    {day.tasks.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            {p.plan.data.days.length > 2 && (
              <ShowMore label={`Show ${p.plan.data.days.length - 2} more day${p.plan.data.days.length - 2 === 1 ? "" : "s"}`}>
                <ol className="dash-list" style={{ marginTop: 0 }}>
                  {p.plan.data.days.slice(2).map((day) => (
                    <li key={day.date} className="dash-plan-day">
                      <h3>{day.label}</h3>
                      <ul>
                        {day.tasks.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </ShowMore>
            )}
            <div className="dash-card__body">
              <button type="button" className="xf-btn xf-btn--ghost xf-btn--sm" onClick={p.plan.onGenerate} disabled={p.plan.loading}>
                {p.plan.loading ? "Regenerating…" : "Regenerate plan"}
              </button>
            </div>
          </>
        )}
      </section>

      {/* COMING UP */}
      <section className="xf-surface dash-card" aria-labelledby="dash-coming-title">
        <div className="dash-card__head">
          <h2 id="dash-coming-title">Coming up</h2>
          {p.upcoming.length > 0 && <span className="xf-chip">{p.upcoming.length} this week</span>}
        </div>

        {p.upcoming.length === 0 ? (
          <p className="dash-card__lead">Nothing due in the next 7 days.</p>
        ) : restUpcoming.length === 0 ? (
          <p className="dash-card__lead">That&apos;s the only thing due this week.</p>
        ) : (
          <>
            <ul className="dash-list">
              {restUpcoming.slice(0, 2).map((item, i) => (
                <UpcomingRow key={`${item.courseId}-${item.assignmentId}-${i}`} item={item} />
              ))}
            </ul>
            {restUpcoming.length > 2 && (
              <ShowMore label={`Show ${restUpcoming.length - 2} more`}>
                <ul className="dash-list" style={{ marginTop: 0 }}>
                  {restUpcoming.slice(2).map((item, i) => (
                    <UpcomingRow key={`${item.courseId}-${item.assignmentId}-${i}`} item={item} />
                  ))}
                </ul>
              </ShowMore>
            )}
          </>
        )}

        {p.upcoming.length > 0 && (
          <ShowMore label="Get these as reminders">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="xf-btn xf-btn--ghost xf-btn--sm"
                onClick={p.email.onSend}
                disabled={p.email.status?.kind === "sending"}
              >
                <Mail size={15} strokeWidth={2} aria-hidden="true" />
                {p.email.status?.kind === "sending" ? "Sending…" : "Email me these"}
              </button>
            </div>
            <StatusLine status={p.email.status} noun="email" verb="emailed" />
          </ShowMore>
        )}
      </section>

      {/* CLASS ANNOUNCEMENTS */}
      <section className="xf-surface dash-card" aria-labelledby="dash-news-title">
        <h2 id="dash-news-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Megaphone size={18} strokeWidth={2} aria-hidden="true" style={{ color: "var(--blue)" }} />
          Class announcements
        </h2>
        {p.announcements.length === 0 ? (
          <p className="dash-card__lead">No announcements right now.</p>
        ) : (
          <>
            {p.isDemo && (
              <p className="dash-note">Simulated — a preview of what a real Canvas-connected feed will show here.</p>
            )}
            <ul className="dash-list">
              {p.announcements.slice(0, 2).map((a) => (
                <AnnouncementRow key={`${a.courseId}-${a.id}`} a={a} />
              ))}
            </ul>
            {p.announcements.length > 2 && (
              <ShowMore label={`Show ${p.announcements.length - 2} more`}>
                <ul className="dash-list" style={{ marginTop: 0 }}>
                  {p.announcements.slice(2).map((a) => (
                    <AnnouncementRow key={`${a.courseId}-${a.id}`} a={a} />
                  ))}
                </ul>
              </ShowMore>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function AnnouncementRow({ a }: { a: Announcement }) {
  return (
    <li>
      <Link href={`/grades/${a.courseId}`} className="dash-row" style={{ display: "block" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 2 }}>
          <p className="dash-row__course" style={{ margin: 0 }}>
            {a.courseName} · {a.author}
          </p>
          <span style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>{timeAgo(a.postedAt)}</span>
        </div>
        <p className="dash-row__title">{a.title}</p>
        <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--text-dim)", lineHeight: 1.5 }}>{a.body}</p>
      </Link>
    </li>
  );
}
