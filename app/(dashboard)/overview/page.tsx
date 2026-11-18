"use client";

import { useEffect, useRef, useState } from "react";
import { getCreditHours, hasDemoCourses, type MockCourse } from "../../../lib/mock-canvas-data";
import { getUserCourses } from "../../../lib/user-courses";
import { getAllAnnouncements } from "../../../lib/mock-announcements";
import { calculateCurrentGrade, calculateWeightedOverallGrade } from "../../../lib/grade-calculator";
import { getOverallGradeHistory, trendDirection } from "../../../lib/grade-history";
import { getUpcomingAssignments } from "../../../lib/upcoming-assignments";
import { createClient } from "../../../lib/supabase/client";
import { TIMEZONE_HEADER, browserTimeZone, localDate } from "../../../lib/local-date";
import { getWeekBounds, minutesByCourse, totalMinutes, type StudySession } from "../../../lib/study-sessions";
import {
  OverviewView,
  type AiError,
  type BulkPlan,
  type RequestStatus,
} from "../../../components/OverviewView";

// This file loads the data and runs the requests (coach check-in, reminder
// email/text, combined study plan); components/OverviewView.tsx lays it out.

export default function OverviewPage() {
  // Fetched client-side on mount, like weekSessions below —
  // this whole page is already a client component, so there's no server
  // wrapper to seed it from. `null` means "still loading."
  const [userCourses, setUserCourses] = useState<Record<string, MockCourse> | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setUserCourses({});
        setCoachLoading(false);
        return;
      }
      getUserCourses(supabase, user.id).then((loaded) => {
        setUserCourses(loaded);
        // The coach check-in is only requested once we know there is
        // something to coach on (see loadDailyCoachTip below).
        loadDailyCoachTip(user.id, Object.keys(loaded).length > 0);
      });
    });
  }, []);

  const courses = userCourses
    ? Object.values(userCourses).map((course) => ({
        id: course.id,
        name: course.name,
        grade: calculateCurrentGrade(course.assignmentGroups),
        creditHours: getCreditHours(course),
      }))
    : [];

  // Weighted by each course's credit hours (an AP/Honors course
  // carrying 1.5 credits pulls the overall grade more than a
  // 1.0-credit course) instead of a plain average across courses.
  const overallGrade = calculateWeightedOverallGrade(courses);
  const totalCredits = courses.reduce((sum, c) => sum + c.creditHours, 0);

  const overallGradeHistory = getOverallGradeHistory(overallGrade, courses.map((c) => c.id));
  const overallTrend = trendDirection(overallGradeHistory);

  // Ungraded assignments due within the next 7 days, across all courses.
  const upcoming = userCourses ? getUpcomingAssignments(userCourses, 7) : [];

  // Class announcements feed — see lib/mock-announcements.ts; only
  // shows entries for demo-seeded courses, empty otherwise.
  const announcements = userCourses ? getAllAnnouncements(userCourses).slice(0, 6) : [];

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
  const [coachError, setCoachError] = useState<AiError>(null);

  // The coach check-in costs a free AI generation, so it is NOT fetched on
  // every visit. The rules (also enforced by app/api/coach-overview):
  //   - no courses  -> no request at all
  //   - one tip per user per local day: today's tip is kept in this browser
  //     (localStorage) so repeat visits make no request; the server also keeps
  //     a copy per user per day, so other devices reuse it too
  // Only ever called from a promise continuation (never synchronously from an
  // effect body), so it's fine to update state here directly.
  const coachRequested = useRef(false);
  const loadDailyCoachTip = (userId: string, hasCourses: boolean) => {
    if (!hasCourses) {
      setCoachLoading(false);
      return;
    }
    // React's dev-mode double-run of effects must not fire two requests.
    if (coachRequested.current) return;
    coachRequested.current = true;

    const timeZone = browserTimeZone();
    const today = localDate(timeZone);
    const storageKey = `xf-coach-tip:${userId}`;
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
      if (saved && saved.date === today && typeof saved.insight === "string") {
        setCoachInsight(saved.insight);
        setCoachLoading(false);
        return;
      }
    } catch {
      // Storage unavailable or unreadable: just ask the server.
    }

    fetch("/api/coach-overview", { headers: { [TIMEZONE_HEADER]: timeZone } })
      .then((res) => res.json().then((data) => ({ ok: res.ok, status: res.status, data })))
      .then(({ ok, status, data }) => {
        if (!ok) {
          setCoachError({
            kind: status === 402 ? "upgrade" : "error",
            message: data.message || data.error || "Failed to generate check-in",
          });
          return;
        }
        if (typeof data.insight === "string") {
          setCoachInsight(data.insight);
          try {
            window.localStorage.setItem(storageKey, JSON.stringify({ date: today, insight: data.insight }));
          } catch {
            // Private mode etc.: the server copy still prevents a second generation.
          }
        }
      })
      .catch(() => setCoachError({ kind: "error", message: "Failed to generate check-in" }))
      .finally(() => setCoachLoading(false));
  };

  const [reminderStatus, setReminderStatus] = useState<RequestStatus>(null);

  const sendReminderEmail = () => {
    setReminderStatus({ kind: "sending" });
    fetch("/api/send-reminders", { method: "POST" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setReminderStatus({ kind: "error", message: data.error || "Failed to send email" });
          return;
        }
        if (data.disabled) {
          // Email isn't switched on yet (no verified sender): nothing was sent.
          setReminderStatus({ kind: "error", message: data.message || "Email reminders aren't switched on yet." });
          return;
        }
        setReminderStatus({ kind: "sent", count: data.count });
      })
      .catch(() => setReminderStatus({ kind: "error", message: "Failed to send email" }));
  };

  // Combined study plan across every course at once — see
  // app/api/bulk-study-plan, which reuses the same AI-usage gating and
  // per-day JSON shape as the per-course study plan on the Grades page,
  // just built from every course's upcoming items instead of one target
  // assignment. Not persisted — regenerates on demand, same as the
  // study guide/practice quiz on the Grades page.
  const [bulkPlan, setBulkPlan] = useState<BulkPlan | null>(null);
  const [bulkPlanLoading, setBulkPlanLoading] = useState(false);
  const [bulkPlanError, setBulkPlanError] = useState<AiError>(null);

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
      className="xf-page-enter xf-dashboard-page"
      style={{
        minHeight: "100vh",
        color: "var(--text)",
        padding: "48px 40px",
      }}
    >
      <OverviewView
        loaded={userCourses !== null}
        isDemo={userCourses !== null && hasDemoCourses(userCourses)}
        courses={courses}
        overallGrade={overallGrade}
        totalCredits={totalCredits}
        trend={overallTrend}
        trendPoints={overallGradeHistory}
        upcoming={upcoming}
        announcements={announcements}
        studyLoaded={weekSessions !== null}
        studyMinutes={weekStudyMinutes}
        studyByCourse={weekStudyByCourse.map((entry) => ({
          courseId: entry.courseId,
          name: userCourses?.[entry.courseId]?.name ?? entry.courseId,
          minutes: entry.minutes,
        }))}
        coach={{ loading: coachLoading, insight: coachInsight, error: coachError }}
        email={{ status: reminderStatus, onSend: sendReminderEmail }}
        plan={{ data: bulkPlan, loading: bulkPlanLoading, error: bulkPlanError, onGenerate: generateBulkPlan }}
      />
    </div>
  );
}
