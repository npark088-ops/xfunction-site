import { mockAssignmentGroups } from "./mock-canvas-data";
import {
  calculateCategoryBreakdown,
  calculateCurrentGrade,
  calculateNeededScore,
} from "./grade-calculator";

console.log("=== Category Breakdown ===");
console.table(calculateCategoryBreakdown(mockAssignmentGroups));

const currentGrade = calculateCurrentGrade(mockAssignmentGroups);
console.log(`\nCurrent overall grade: ${currentGrade.toFixed(1)}%`);

console.log("\n=== Scenario: I want a 90% (A-) overall in this class ===");
const result = calculateNeededScore(mockAssignmentGroups, 302, 90); // Unit 2 Test, ungraded
console.log(
  `On "Unit 2 Test" (${result.possiblePoints} pts possible), you need: ${result.neededPoints} points (${result.neededPercentage}%)`
);
console.log(`Achievable: ${result.isAchievable}`);

console.log("\n=== Scenario: I want a 95% (A) overall — check if it's even possible ===");
const result2 = calculateNeededScore(mockAssignmentGroups, 302, 95);
console.log(
  `On "Unit 2 Test" (${result2.possiblePoints} pts possible), you'd need: ${result2.neededPoints} points (${result2.neededPercentage}%)`
);
console.log(`Achievable: ${result2.isAchievable}`);
