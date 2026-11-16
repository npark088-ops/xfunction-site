// SIMULATED DATA FOR DEMO COURSES ONLY — NOT REAL HISTORY
// ---------------------------------------------------------------------
// Real per-user courses (see lib/user-courses.ts) have no historical
// snapshots — there's no daily/weekly grade feed being recorded, so
// there's genuinely nothing to show but the current live grade. These
// hand-authored fake weekly percentages exist ONLY to make "Load demo
// data"'s 3 seeded courses ("ap-biology", "us-history", "algebra-2" —
// see lib/mock-canvas-data.ts) demo well, since they keep those exact
// original ids when seeded (see the migration file's comment for why).
// getCourseGradeHistory() below already degrades correctly for any
// other id (empty `past`, so it returns just the live current point) —
// getOverallGradeHistory() needs the same "is this actually the demo
// set" check made explicit, since it used to derive its course list
// from this dict directly rather than from whatever the caller passed.
//
// The most recent point in every returned series is always the LIVE
// calculated grade (passed in by the caller), not a hardcoded number —
// so history never drifts out of sync with the actual assignment data
// if that changes.

import { mockCourses, getCreditHours } from "./mock-canvas-data";

export interface GradePoint {
  label: string;
  percentage: number;
}

// One value per week, oldest first. Same length for every course so
// they line up for the combined/averaged view on the App page.
const PAST_WEEKS_BY_COURSE: Record<string, number[]> = {
  "ap-biology": [73.5, 75.0, 74.2, 76.5, 77.8, 78.0, 79.2],
  "us-history": [83.0, 81.8, 80.5, 79.8, 78.5, 78.8, 77.9],
  "algebra-2": [85.0, 86.0, 85.2, 87.1, 85.5, 86.8, 85.9],
};

function weekLabel(weeksAgo: number): string {
  if (weeksAgo === 0) return "This week";
  const date = new Date(Date.now() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getCourseGradeHistory(courseId: string, currentGrade: number): GradePoint[] {
  const past = PAST_WEEKS_BY_COURSE[courseId] ?? [];
  const totalPoints = past.length + 1;

  const points = past.map((percentage, i) => ({
    label: weekLabel(totalPoints - 1 - i),
    percentage,
  }));
  points.push({ label: weekLabel(0), percentage: currentGrade });
  return points;
}

// Credit-weighted, same as the live overall grade (see
// calculateWeightedOverallGrade in lib/grade-calculator.ts) — otherwise
// the trend line would visibly kink where simulated history (unweighted)
// meets the live current-week point (weighted).
//
// `courseIds` is the caller's REAL current course list. The fabricated
// multi-week trend below only ever applies when every one of those ids
// is a known demo id (i.e. the account is exactly the seeded demo set,
// or a subset of it) — any genuinely manual course breaks that, and the
// function falls back to an honest single point instead of blending
// real data into a fake trend line.
export function getOverallGradeHistory(
  currentOverallGrade: number,
  courseIds: string[]
): GradePoint[] {
  const isDemoSet = courseIds.length > 0 && courseIds.every((id) => id in PAST_WEEKS_BY_COURSE);
  if (!isDemoSet) {
    return [{ label: weekLabel(0), percentage: Math.round(currentOverallGrade * 10) / 10 }];
  }

  const weekCount = PAST_WEEKS_BY_COURSE[courseIds[0]].length;
  const credits = courseIds.map((id) => getCreditHours(mockCourses[id]));
  const totalCredits = credits.reduce((sum, c) => sum + c, 0);

  const points: GradePoint[] = [];
  for (let i = 0; i < weekCount; i++) {
    const weightedSum = courseIds.reduce(
      (sum, id, idx) => sum + PAST_WEEKS_BY_COURSE[id][i] * credits[idx],
      0
    );
    const average = totalCredits > 0 ? weightedSum / totalCredits : 0;
    points.push({ label: weekLabel(weekCount - i), percentage: Math.round(average * 10) / 10 });
  }
  points.push({ label: weekLabel(0), percentage: currentOverallGrade });
  return points;
}

export function trendDirection(points: GradePoint[]): "up" | "down" | "steady" {
  if (points.length < 2) return "steady";
  const diff = points[points.length - 1].percentage - points[0].percentage;
  if (diff > 1.5) return "up";
  if (diff < -1.5) return "down";
  return "steady";
}
