import type { MockCourse } from "./mock-canvas-data";
import { calendarDaysBetween, defaultTimeZone, localDate } from "./local-date";
import { dueCalendarDate, dueInstant } from "./due-dates";

// Same "urgent" threshold used by the App page's Coming Up section and
// by the email reminder route — kept in one place so they can't drift
// out of sync with each other.
export const URGENT_WITHIN_DAYS = 2;

// Anything due further out than URGENT_WITHIN_DAYS but within this
// window gets batched into a single daily digest instead of its own
// individual notification/email line — see lib/activity-notifications.ts
// and app/api/send-reminders. Beyond this window, nothing fires at all
// (it still shows passively in the "Coming up" 7-day list).
export const DIGEST_WITHIN_DAYS = 7;

export interface UpcomingAssignment {
  courseId: string;
  assignmentId: number;
  courseName: string;
  assignmentName: string;
  dueAt: Date;
  daysAway: number;
}

// Ungraded assignments due within `withinDays` CALENDAR days (0 = today
// only), across all courses, sorted soonest-first. `courses` is the caller's
// real per-user data (see lib/user-courses.ts) — this function is otherwise
// fully generic, it just walks whatever assignmentGroups/assignments it's
// handed.
//
// "Today" and `daysAway` are the STUDENT'S calendar days (`timeZone`: pass the
// request's zone on the server, see lib/request-tz.ts; in the browser it
// defaults to the browser's own zone). daysAway 0 = due today, 1 = tomorrow.
// A date-only due date counts as due by the end of that day (see
// lib/due-dates.ts).
export function getUpcomingAssignments(
  courses: Record<string, MockCourse>,
  withinDays: number,
  timeZone: string = defaultTimeZone()
): UpcomingAssignment[] {
  const now = new Date();
  const today = localDate(timeZone, now);

  return Object.values(courses)
    .flatMap((c) =>
      c.assignmentGroups.flatMap((g) =>
        g.assignments
          .filter((a) => a.submission?.score == null && a.due_at)
          .map((a) => ({
            courseId: c.id,
            assignmentId: a.id,
            courseName: c.name,
            assignmentName: a.name,
            dueAt: dueInstant(a.due_at as string, timeZone),
            daysAway: calendarDaysBetween(today, dueCalendarDate(a.due_at as string, timeZone)),
          }))
      )
    )
    .filter((a) => a.dueAt >= now && a.daysAway <= withinDays)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

// The "batch these into one summary" tier — due later than
// URGENT_WITHIN_DAYS but within DIGEST_WITHIN_DAYS. Urgent items are
// excluded here on purpose: they're surfaced individually and
// immediately elsewhere, not folded into the digest.
export function getDigestAssignments(
  courses: Record<string, MockCourse>,
  timeZone: string = defaultTimeZone()
): UpcomingAssignment[] {
  return getUpcomingAssignments(courses, DIGEST_WITHIN_DAYS, timeZone).filter(
    (a) => a.daysAway > URGENT_WITHIN_DAYS
  );
}

// Everything still due on the student's current calendar day. (Items already
// past their time today are not included, same as the other lists here.)
export function getAssignmentsDueToday(
  courses: Record<string, MockCourse>,
  timeZone: string = defaultTimeZone()
): UpcomingAssignment[] {
  return getUpcomingAssignments(courses, 0, timeZone);
}

// A tighter, exact-hours check for the in-app toast reminder (see
// components/ToastWatcher.tsx) — deliberately stricter than
// URGENT_WITHIN_DAYS (2 calendar days, used by the notification bell
// and email digest). A toast interrupts what the student's doing right
// now, so it's reserved for "due in the next 24 hours," not "due in
// the next two days."
export function getUrgentWithin24Hours(
  courses: Record<string, MockCourse>,
  timeZone: string = defaultTimeZone()
): UpcomingAssignment[] {
  const now = Date.now();
  return getUpcomingAssignments(courses, 2, timeZone).filter((a) => a.dueAt.getTime() - now <= 24 * 60 * 60 * 1000);
}
