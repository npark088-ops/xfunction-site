import { addDaysToDate, defaultTimeZone, formatCalendarDate, localDate, localDayStart } from "./local-date";

// Due dates are stored as timestamps (assignments.due_at). Two kinds exist:
//
//  - DATE-ONLY: what the Gradebook's date box saves. Typing "Nov 20" stores
//    midnight UTC on Nov 20 ("2026-11-20T00:00:00Z"). It means "due on Nov 20"
//    wherever the student is, due by the end of that day. Read as a plain
//    instant it is Nov 19 evening in the US, which is how assignments used to
//    show up a day early.
//  - TIMED: imported or demo data with a real time ("...T23:59:00Z"). These
//    are real moments; the student's own calendar date for them is the date
//    in their time zone.
//
// These helpers give every screen the same answer for "which day is it due".

const DATE_ONLY = /T00:00:00(\.0+)?(Z|[+-]00:?00)$/;

export function isDateOnlyDue(dueAt: string): boolean {
  return DATE_ONLY.test(dueAt);
}

// Calendar date ("YYYY-MM-DD") the assignment is due, for a student in `timeZone`.
export function dueCalendarDate(dueAt: string, timeZone: string = defaultTimeZone()): string {
  return isDateOnlyDue(dueAt) ? dueAt.slice(0, 10) : localDate(timeZone, new Date(dueAt));
}

// The moment it is actually due: a timed due date as given; a date-only one
// at the very end of that day in the student's zone.
export function dueInstant(dueAt: string, timeZone: string = defaultTimeZone()): Date {
  if (!isDateOnlyDue(dueAt)) return new Date(dueAt);
  const nextDayStart = localDayStart(timeZone, addDaysToDate(dueAt.slice(0, 10), 1));
  return new Date(nextDayStart.getTime() - 1);
}

// "Nov 20" (or any Intl options) for display.
export function formatDueDate(
  dueAt: string,
  timeZone: string = defaultTimeZone(),
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
): string {
  return formatCalendarDate(dueCalendarDate(dueAt, timeZone), options);
}

// Value for an <input type="date"> showing an existing due date.
export function dueToInputValue(dueAt: string | null): string {
  return dueAt ? dueCalendarDate(dueAt) : "";
}

// What to store for a date typed into an <input type="date"> (date-only form).
export function inputValueToDueAt(value: string): string | null {
  return value ? `${value}T00:00:00.000Z` : null;
}
