import { CanvasAssignmentGroup } from "./canvas-types";

/**
 * GRADE CALCULATOR
 * ------------------
 * This is deliberately plain math, not AI — it needs to be exactly
 * right every time, and a calculator is more trustworthy (and cheaper
 * to run) than asking a language model to do arithmetic.
 *
 * Canvas's real weighted-grade formula:
 * 1. Within each category (assignment group), average the *graded*
 *    assignments as (points earned / points possible).
 * 2. Multiply each category's average by its weight.
 * 3. Sum those weighted averages, then re-normalize by the total
 *    weight of categories that have at least one graded assignment
 *    (so an empty "Tests" category doesn't drag your grade to 0).
 */

interface CategoryResult {
  groupId: number;
  name: string;
  weight: number;
  earnedPoints: number;
  possiblePoints: number;
  percentage: number | null; // null if nothing graded yet in this category
}

export function calculateCategoryBreakdown(
  groups: CanvasAssignmentGroup[]
): CategoryResult[] {
  return groups.map((group) => {
    let earned = 0;
    let possible = 0;

    for (const assignment of group.assignments) {
      const submission = assignment.submission;
      if (submission && submission.score !== null && submission.score !== undefined) {
        earned += submission.score;
        possible += assignment.points_possible;
      }
    }

    return {
      groupId: group.id,
      name: group.name,
      weight: group.group_weight,
      earnedPoints: earned,
      possiblePoints: possible,
      percentage: possible > 0 ? (earned / possible) * 100 : null,
    };
  });
}

export function calculateCurrentGrade(groups: CanvasAssignmentGroup[]): number {
  const breakdown = calculateCategoryBreakdown(groups);

  const gradedCategories = breakdown.filter((c) => c.percentage !== null);
  const totalActiveWeight = gradedCategories.reduce((sum, c) => sum + c.weight, 0);

  if (totalActiveWeight === 0) return 0;

  const weightedSum = gradedCategories.reduce(
    (sum, c) => sum + (c.percentage as number) * c.weight,
    0
  );

  return weightedSum / totalActiveWeight;
}

// Overall grade across courses, weighted by each course's credit
// hours instead of a plain average — an AP/Honors course carrying 1.5
// credits should pull the overall grade more than a 1.0-credit course.
export function calculateWeightedOverallGrade(
  courses: { grade: number; creditHours: number }[]
): number {
  const totalCredits = courses.reduce((sum, c) => sum + c.creditHours, 0);
  if (totalCredits === 0) return 0;

  const weightedSum = courses.reduce((sum, c) => sum + c.grade * c.creditHours, 0);
  return weightedSum / totalCredits;
}

/**
 * The core product feature: "what do I need to score on THIS assignment
 * to reach my target overall grade?"
 *
 * Strategy: everything else in the gradebook (graded work, plus any
 * other still-ungraded assignments) is held fixed at its current state.
 * We solve algebraically for the score on the ONE target assignment
 * that makes the overall weighted grade equal the target.
 */
export function calculateNeededScore(
  groups: CanvasAssignmentGroup[],
  targetAssignmentId: number,
  targetOverallGrade: number
): {
  neededPoints: number;
  neededPercentage: number;
  possiblePoints: number;
  isAchievable: boolean;
} {
  // Find which group the target assignment lives in
  const targetGroup = groups.find((g) =>
    g.assignments.some((a) => a.id === targetAssignmentId)
  );
  const targetAssignment = targetGroup?.assignments.find(
    (a) => a.id === targetAssignmentId
  );

  if (!targetGroup || !targetAssignment) {
    throw new Error(`Assignment ${targetAssignmentId} not found`);
  }

  // Weighted contribution from every OTHER category (unaffected by the target assignment)
  const otherCategoriesWeightedSum = groups
    .filter((g) => g.id !== targetGroup.id)
    .reduce((sum, g) => {
      const breakdown = calculateCategoryBreakdown([g])[0];
      if (breakdown.percentage === null) return sum;
      return sum + breakdown.percentage * breakdown.weight;
    }, 0);

  const otherCategoriesWeight = groups
    .filter((g) => g.id !== targetGroup.id)
    .reduce((sum, g) => {
      const breakdown = calculateCategoryBreakdown([g])[0];
      return breakdown.percentage !== null ? sum + g.group_weight : sum;
    }, 0);

  // Points already earned/possible in the target category, EXCLUDING the target assignment
  let earnedInTargetCategory = 0;
  let possibleInTargetCategory = 0;
  for (const a of targetGroup.assignments) {
    if (a.id === targetAssignmentId) continue;
    if (a.submission?.score !== null && a.submission?.score !== undefined) {
      earnedInTargetCategory += a.submission.score;
      possibleInTargetCategory += a.points_possible;
    }
  }

  const targetCategoryWeight = targetGroup.group_weight;
  const totalWeight = otherCategoriesWeight + targetCategoryWeight;

  // Solve: targetOverallGrade * totalWeight = otherCategoriesWeightedSum
  //        + targetCategoryWeight * (newCategoryPercentage)
  // where newCategoryPercentage depends on the score we're solving for.
  const requiredTargetCategoryPercentage =
    (targetOverallGrade * totalWeight - otherCategoriesWeightedSum) /
    targetCategoryWeight;

  // newCategoryPercentage = (earnedInTargetCategory + neededPoints)
  //                         / (possibleInTargetCategory + assignment.points_possible) * 100
  const newPossibleTotal = possibleInTargetCategory + targetAssignment.points_possible;
  const neededPoints =
    (requiredTargetCategoryPercentage / 100) * newPossibleTotal - earnedInTargetCategory;

  const neededPercentage = (neededPoints / targetAssignment.points_possible) * 100;

  return {
    neededPoints: Math.round(neededPoints * 10) / 10,
    neededPercentage: Math.round(neededPercentage * 10) / 10,
    possiblePoints: targetAssignment.points_possible,
    isAchievable: neededPercentage <= 100 && neededPercentage >= 0,
  };
}
