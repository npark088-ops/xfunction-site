import { CanvasAssignmentGroup } from "./canvas-types";
import { calculateCurrentGrade } from "./grade-calculator";

export interface GradeProjection {
  projectedGrade: number;
  currentGrade: number;
  percentGraded: number; // 0-100, how much of the course's total points are already graded
}

// A simple "stay the course" estimate, not a statistical model: for
// every assignment group, whatever points aren't graded yet are
// assumed to score at the student's current overall percentage, then
// the whole course is re-weighted the normal way. This gives a rough
// sense of where the final grade is headed without pretending to
// predict individual future scores.
export function projectFinalGrade(groups: CanvasAssignmentGroup[]): GradeProjection {
  const currentGrade = calculateCurrentGrade(groups);

  let totalPossible = 0;
  let totalGradedPossible = 0;
  let projectedWeightedSum = 0;
  let totalWeight = 0;

  for (const group of groups) {
    let earned = 0;
    let possible = 0;
    let gradedPossible = 0;

    for (const a of group.assignments) {
      possible += a.points_possible;
      if (a.submission?.score != null) {
        earned += a.submission.score;
        gradedPossible += a.points_possible;
      }
    }

    totalPossible += possible;
    totalGradedPossible += gradedPossible;

    const remainingPossible = possible - gradedPossible;
    const projectedEarned = earned + remainingPossible * (currentGrade / 100);
    const projectedPercentage = possible > 0 ? (projectedEarned / possible) * 100 : currentGrade;

    projectedWeightedSum += projectedPercentage * group.group_weight;
    totalWeight += group.group_weight;
  }

  const projectedGrade = totalWeight > 0 ? projectedWeightedSum / totalWeight : currentGrade;
  const percentGraded = totalPossible > 0 ? (totalGradedPossible / totalPossible) * 100 : 0;

  return {
    projectedGrade: Math.round(projectedGrade * 10) / 10,
    currentGrade,
    percentGraded: Math.round(percentGraded),
  };
}
