// "What day is it for THIS student?" helpers.
//
// The server runs in UTC, so `new Date().toISOString().slice(0, 10)` gives the
// UTC date: for a US student after about 5-8 pm that is already TOMORROW. These
// helpers work out the calendar date (and weekday) in a given IANA time zone
// instead. The browser's time zone reaches the server two ways (see
// lib/request-tz.ts): an `x-timezone` request header on fetches, and a cookie
// that components/TimezoneSync.tsx keeps up to date for page loads.
//
// Pure functions, no imports: safe to use from server and client code.

export const TIMEZONE_COOKIE = "xf_tz";
export const TIMEZONE_HEADER = "x-timezone";

// Only real IANA zone names are accepted (the value comes from a header or
// cookie, so it is untrusted); anything else falls back to UTC.
export function resolveTimeZone(value: string | null | undefined): string {
  if (!value) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return "UTC";
  }
}

// The time zone this browser is set to ("America/Chicago", ...). Client only.
export function browserTimeZone(): string {
  try {
    return resolveTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return "UTC";
  }
}

// Calendar date "YYYY-MM-DD" of `at` in `timeZone`.
export function localDate(timeZone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Day of week (0 = Sunday ... 6 = Saturday) of `at` in `timeZone`.
export function localWeekday(timeZone: string, at: Date = new Date()): number {
  const short = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(at);
  return Math.max(0, WEEKDAYS.indexOf(short));
}

// "YYYY-MM-DD" plus/minus whole days. Plain calendar arithmetic (done in UTC so
// daylight-saving changes can't shift the result).
export function addDaysToDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// The zone to use when the caller doesn't pass one: the browser's own zone in
// client code, UTC on the server (server code should pass the request's zone,
// see lib/request-tz.ts).
export function defaultTimeZone(): string {
  return typeof window !== "undefined" ? browserTimeZone() : "UTC";
}

// Whole calendar days from date `from` to date `to` ("YYYY-MM-DD" each).
export function calendarDaysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

// How far `timeZone` is ahead of UTC at instant `at`, in milliseconds.
function zoneOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

// The instant a calendar date ("YYYY-MM-DD") begins in `timeZone` (local
// midnight). Handles daylight-saving changes.
export function localDayStart(timeZone: string, date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - zoneOffsetMs(timeZone, new Date(guess));
  const second = guess - zoneOffsetMs(timeZone, new Date(first));
  return new Date(second);
}

// "Thu, Nov 19" style label for a calendar date. Formats in UTC on purpose:
// the date is already the student's calendar date, so no further zone shift.
export function formatCalendarDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }
): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}
