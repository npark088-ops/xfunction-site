"use client";

import { useEffect } from "react";
import { useEncouragement, useReminderToast } from "./ToastProvider";
import { getUrgentWithin24Hours } from "../lib/upcoming-assignments";
import { alreadyShownToday, markShownToday } from "../lib/toast-dedupe";
import { createClient } from "../lib/supabase/client";
import { getUserCourses } from "../lib/user-courses";

// Mounted once inside ToastProvider (see app/(dashboard)/layout.tsx),
// not per-page — layouts don't remount on client-side navigation
// between sibling routes, so this effect genuinely fires once per app
// visit regardless of which dashboard page the student lands on first,
// the same "once, not on every navigation" cost as the notification
// sync in app/(dashboard)/overview/page.tsx.
//
// Three triggers, each capped to at most one toast per calendar day so
// this can never turn into a stream of pop-ups:
//   1. An assignment due within 24 hours (this student's real courses,
//      fetched client-side on mount).
//   2. A newly unlocked achievement (server-computed, self-deduping —
//      see app/api/toast-check).
//   3. A planned study session for today with nothing logged yet —
//      only after 3pm local time, so it reads as "you haven't gotten to
//      this yet" rather than nagging first thing in the morning.
export function ToastWatcher() {
  const celebrate = useEncouragement();
  const remind = useReminderToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      getUserCourses(supabase, user.id).then((courses) => {
        const urgent = getUrgentWithin24Hours(courses);
        if (urgent.length > 0 && !alreadyShownToday("xf-toast-urgent")) {
          markShownToday("xf-toast-urgent");
          remind(
            urgent.length === 1
              ? `"${urgent[0].assignmentName}" (${urgent[0].courseName}) is due within 24 hours.`
              : `${urgent.length} assignments are due within 24 hours.`
          );
        }
      });
    });

    fetch("/api/toast-check")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;

        for (const achievement of data.newAchievements ?? []) {
          celebrate(`Achievement unlocked: ${achievement.name}`);
        }

        const plannedNotStarted = data.plannedNotStarted ?? [];
        const pastCheckInTime = new Date().getHours() >= 15;
        if (plannedNotStarted.length > 0 && pastCheckInTime && !alreadyShownToday("xf-toast-study")) {
          markShownToday("xf-toast-study");
          remind(
            plannedNotStarted.length === 1
              ? `You planned to study ${plannedNotStarted[0].courseName} today — haven't started yet?`
              : `You have ${plannedNotStarted.length} planned study sessions today you haven't started yet.`
          );
        }
      })
      .catch(() => {});
    // Deliberately once per mount — celebrate/remind are stable
    // function identities from context, not changing dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
