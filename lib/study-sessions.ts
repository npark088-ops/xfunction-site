// Pure calculations over logged study sessions (supabase/migrations/0018_study_sessions.sql).
// Shared by the Overview weekly summary card, the Schedule page's
// week/month calendar, and the Study Stats trends section, so all three
// agree on what "this week" and "minutes studied" mean.

export interface StudySession {
  id: string;
  course_id: string;
  duration_minutes: number;
  occurred_at: string;
}

// Monday-Sunday week containing `reference`, at local midnight
// boundaries — matches the Schedule page's Monday-first week grid.
export function getWeekBounds(reference: Date): { start: Date; end: Date } {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function sessionsInRange(sessions: StudySession[], start: Date, end: Date): StudySession[] {
  return sessions.filter((s) => {
    const t = new Date(s.occurred_at).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
}

export function totalMinutes(sessions: StudySession[]): number {
  return sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
}

export interface CourseMinutes {
  courseId: string;
  minutes: number;
}

export function minutesByCourse(sessions: StudySession[]): CourseMinutes[] {
  const totals = new Map<string, number>();
  for (const s of sessions) {
    totals.set(s.course_id, (totals.get(s.course_id) ?? 0) + s.duration_minutes);
  }
  return Array.from(totals.entries())
    .map(([courseId, minutes]) => ({ courseId, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export interface WeeklyTotal {
  weekStart: Date;
  label: string;
  minutes: number;
}

// Weekly totals for the last `weeks` weeks (including the current,
// possibly-partial week), oldest first — feeds the Study Stats trend
// chart on the Schedule page.
export function weeklyTotals(sessions: StudySession[], weeks: number): WeeklyTotal[] {
  const { start: currentWeekStart } = getWeekBounds(new Date());
  const result: WeeklyTotal[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    result.push({
      weekStart,
      label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      minutes: totalMinutes(sessionsInRange(sessions, weekStart, weekEnd)),
    });
  }
  return result;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Total minutes per weekday (index 0=Sun..6=Sat, matching Date#getDay()),
// summed across every logged session regardless of which real week it
// fell in — this is "which day of the week", not "which week".
export function minutesByWeekday(sessions: StudySession[]): number[] {
  const totals = new Array(7).fill(0);
  for (const s of sessions) {
    totals[new Date(s.occurred_at).getDay()] += s.duration_minutes;
  }
  return totals;
}

export interface TimeOfDayBucket {
  label: string;
  minutes: number;
}

// Coarse buckets rather than 24 individual hours — easier to read at a
// glance, and a single session rarely needs hour-level precision to
// answer "am I more of a morning or evening studier."
const TIME_OF_DAY_BUCKETS: { label: string; startHour: number; endHour: number }[] = [
  { label: "Morning", startHour: 5, endHour: 12 },
  { label: "Afternoon", startHour: 12, endHour: 17 },
  { label: "Evening", startHour: 17, endHour: 21 },
  { label: "Night", startHour: 21, endHour: 5 },
];

// Bucketed by completion hour — a reasonable proxy for "when this
// session happened" without needing a separate stored start time.
export function minutesByTimeOfDay(sessions: StudySession[]): TimeOfDayBucket[] {
  return TIME_OF_DAY_BUCKETS.map((bucket) => {
    const minutes = sessions.reduce((sum, s) => {
      const hour = new Date(s.occurred_at).getHours();
      const inBucket =
        bucket.startHour < bucket.endHour
          ? hour >= bucket.startHour && hour < bucket.endHour
          : hour >= bucket.startHour || hour < bucket.endHour; // wraps past midnight (Night)
      return inBucket ? sum + s.duration_minutes : sum;
    }, 0);
    return { label: bucket.label, minutes };
  });
}

// Compares the older half of the window against the more recent half
// (rather than just first-week-vs-last-week) so one unusually light or
// heavy week doesn't flip the verdict on its own. "no-data" means too
// little logged history to say anything meaningful yet.
export function weeklyTrendDirection(weekly: WeeklyTotal[]): "up" | "down" | "steady" | "no-data" {
  if (weekly.every((w) => w.minutes === 0)) return "no-data";
  const mid = Math.floor(weekly.length / 2);
  const earlier = weekly.slice(0, mid);
  const later = weekly.slice(mid);
  const avg = (arr: WeeklyTotal[]) => (arr.length ? arr.reduce((s, w) => s + w.minutes, 0) / arr.length : 0);
  const earlierAvg = avg(earlier);
  const laterAvg = avg(later);
  if (earlierAvg === 0) return laterAvg > 0 ? "up" : "no-data";
  const change = (laterAvg - earlierAvg) / earlierAvg;
  if (change > 0.15) return "up";
  if (change < -0.15) return "down";
  return "steady";
}
