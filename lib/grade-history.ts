// SIMULATED DATA — NOT REAL CANVAS HISTORY
// ---------------------------------------------------------------------
// Canvas's real API can provide grade history, but this app's mock
// Canvas integration only has a single current snapshot of each
// course's assignments — there's no historical feed to pull from yet.
// These are hand-authored fake weekly percentages standing in for what
// a real history endpoint would eventually provide, so the trend UI has
// something real to render and demo. Every place this data is shown
// must label it as simulated (see the trend chart components).
//
// The most recent point in every returned series is always the LIVE
// calculated grade (passed in by the caller), not a hardcoded number —
// so history never drifts out of sync with the actual mock assignment
// data if that changes.

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

export function getOverallGradeHistory(currentOverallGrade: number): GradePoint[] {
  const courseIds = Object.keys(PAST_WEEKS_BY_COURSE);
  const weekCount = PAST_WEEKS_BY_COURSE[courseIds[0]].length;

  const points: GradePoint[] = [];
  for (let i = 0; i < weekCount; i++) {
    const average =
      courseIds.reduce((sum, id) => sum + PAST_WEEKS_BY_COURSE[id][i], 0) / courseIds.length;
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
