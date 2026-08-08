import { mockCourses } from "./mock-canvas-data";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

// Ungraded assignments due within `withinDays`, across all courses,
// sorted soonest-first. Shared by app/app/page.tsx (7-day "Coming up"
// list) and app/api/send-reminders (2-day "urgent" window), so both
// always agree on what counts as upcoming/urgent.
export function getUpcomingAssignments(withinDays: number): UpcomingAssignment[] {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + withinDays * MS_PER_DAY);

  return Object.values(mockCourses)
    .flatMap((c) =>
      c.assignmentGroups.flatMap((g) =>
        g.assignments
          .filter((a) => a.submission?.score == null && a.due_at)
          .map((a) => ({
            courseId: c.id,
            assignmentId: a.id,
            courseName: c.name,
            assignmentName: a.name,
            dueAt: new Date(a.due_at as string),
          }))
      )
    )
    .filter((a) => a.dueAt >= now && a.dueAt <= windowEnd)
    .map((a) => ({
      ...a,
      daysAway: Math.ceil((a.dueAt.getTime() - now.getTime()) / MS_PER_DAY),
    }))
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

// The "batch these into one summary" tier — due later than
// URGENT_WITHIN_DAYS but within DIGEST_WITHIN_DAYS. Urgent items are
// excluded here on purpose: they're surfaced individually and
// immediately elsewhere, not folded into the digest.
export function getDigestAssignments(): UpcomingAssignment[] {
  return getUpcomingAssignments(DIGEST_WITHIN_DAYS).filter((a) => a.daysAway > URGENT_WITHIN_DAYS);
}

// Exact calendar-day match rather than the daysAway heuristic — a
// "due in 6 hours" assignment and a "due in 26 hours" assignment can
// both round to daysAway 0 or 1 depending on time of day, which isn't
// precise enough for "what's due today" on the Today page.
export function getAssignmentsDueToday(): UpcomingAssignment[] {
  const now = new Date();
  return getUpcomingAssignments(1).filter(
    (a) =>
      a.dueAt.getFullYear() === now.getFullYear() &&
      a.dueAt.getMonth() === now.getMonth() &&
      a.dueAt.getDate() === now.getDate()
  );
}

// A tighter, exact-hours check for the in-app toast reminder (see
// components/ToastWatcher.tsx) — deliberately stricter than
// URGENT_WITHIN_DAYS (2 calendar days, used by the notification bell
// and email digest). A toast interrupts what the student's doing right
// now, so it's reserved for "due in the next 24 hours," not "due in
// the next two days."
export function getUrgentWithin24Hours(): UpcomingAssignment[] {
  const now = Date.now();
  return getUpcomingAssignments(2).filter((a) => a.dueAt.getTime() - now <= 24 * 60 * 60 * 1000);
}
