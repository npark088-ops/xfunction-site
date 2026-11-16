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
