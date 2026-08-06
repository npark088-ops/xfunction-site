import { mockCourses } from "./mock-canvas-data";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Same "urgent" threshold used by the App page's Coming Up section and
// by the email reminder route — kept in one place so they can't drift
// out of sync with each other.
export const URGENT_WITHIN_DAYS = 2;

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
