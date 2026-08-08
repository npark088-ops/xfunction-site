import { mockCourses, getCreditHours } from "./mock-canvas-data";
import {
  calculateCurrentGrade,
  calculateCategoryBreakdown,
  calculateWeightedOverallGrade,
} from "./grade-calculator";
import { letterGradeFor } from "./grading-scale";
import { getCourseGradeHistory, trendDirection } from "./grade-history";
import { projectFinalGrade } from "./grade-projection";

// Shared by app/api/ask (chat) and, in principle, anything else that needs
// to ground an AI response in the student's real situation — same
// underlying data as the coach check-in (lib/coach-insight.ts) and the
// grade calculator/projection, just assembled into one plain-text block
// instead of a single insight.
export function buildAcademicContext(): string {
  const courses = Object.values(mockCourses);

  const perCourse = courses.map((course) => {
    const grade = calculateCurrentGrade(course.assignmentGroups);
    const letter = letterGradeFor(grade, course.gradingScale);
    const breakdown = calculateCategoryBreakdown(course.assignmentGroups);
    const history = getCourseGradeHistory(course.id, grade);
    const trend = trendDirection(history);
    const projection = projectFinalGrade(course.assignmentGroups);

    const breakdownText = breakdown
      .map(
        (c) =>
          `${c.name} ${c.percentage !== null ? `${Math.round(c.percentage)}%` : "no grades yet"} (${c.weight}% of grade)`
      )
      .join(", ");

    const upcoming = course.assignmentGroups
      .flatMap((g) => g.assignments.map((a) => ({ ...a, groupName: g.name })))
      .filter((a) => a.submission?.score == null && a.due_at)
      .sort((a, b) => new Date(a.due_at as string).getTime() - new Date(b.due_at as string).getTime())
      .map(
        (a) =>
          `"${a.name}" (${a.groupName}, ${a.points_possible} pts) due ${new Date(a.due_at as string).toDateString()}`
      )
      .join("; ");

    return `- ${course.name} (${getCreditHours(course)} credits): ${grade.toFixed(1)}% (${letter}) overall, trend ${trend}. Breakdown: ${breakdownText}. Projected final grade: ${projection.projectedGrade.toFixed(1)}% (based on ${projection.percentGraded}% of the course graded so far). Upcoming ungraded work: ${upcoming || "none"}.`;
  });

  const overall = calculateWeightedOverallGrade(
    courses.map((c) => ({
      grade: calculateCurrentGrade(c.assignmentGroups),
      creditHours: getCreditHours(c),
    }))
  );

  return `Overall credit-weighted grade across all courses: ${overall.toFixed(1)}%.\n\nCourses:\n${perCourse.join("\n")}`;
}
