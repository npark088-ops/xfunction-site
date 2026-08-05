import { CanvasAssignment, CanvasAssignmentGroup } from "./canvas-types";

// Shared by the study-plan and study-guide API routes: picks which
// upcoming assignment to build AI content around.
export function findTargetAssignment(groups: CanvasAssignmentGroup[]) {
  const ungraded: { group: CanvasAssignmentGroup; assignment: CanvasAssignment }[] = [];
  for (const group of groups) {
    for (const assignment of group.assignments) {
      if (!assignment.submission || assignment.submission.score === null) {
        ungraded.push({ group, assignment });
      }
    }
  }
  if (ungraded.length === 0) return null;

  const byDueDate = (a: typeof ungraded[number], b: typeof ungraded[number]) =>
    new Date(a.assignment.due_at ?? 0).getTime() - new Date(b.assignment.due_at ?? 0).getTime();

  // "Test or big assignment" — prefer a Tests-category or high-point item;
  // fall back to whatever's next if nothing qualifies as "big".
  const big = ungraded
    .filter((c) => /test/i.test(c.group.name) || c.assignment.points_possible >= 50)
    .sort(byDueDate);

  return (big.length > 0 ? big : ungraded.sort(byDueDate))[0];
}

// Picks which OTHER assignment names are actually relevant context for a
// given target — not just "every other assignment in the course," which
// dilutes the signal with older material. Uses the most recent prior test
// as a unit boundary: only assignments due after that boundary (and
// before the target) count as "this unit's" material, since a Test
// typically marks the end of one unit and the start of the next.
export function relevantContextAssignmentNames(
  groups: CanvasAssignmentGroup[],
  target: { group: CanvasAssignmentGroup; assignment: CanvasAssignment }
): string[] {
  const all = groups
    .flatMap((g) =>
      g.assignments.map((a) => ({
        name: a.name,
        due: new Date(a.due_at ?? 0).getTime(),
        isTest: /test/i.test(g.name),
      }))
    )
    .filter((a) => a.name !== target.assignment.name)
    .sort((a, b) => a.due - b.due);

  const targetDue = new Date(target.assignment.due_at ?? 0).getTime();

  let boundary = -1;
  for (let i = 0; i < all.length; i++) {
    if (all[i].due < targetDue && all[i].isTest) boundary = i;
  }

  const sinceLastTest = all.filter((a, i) => i > boundary && a.due < targetDue);

  // Fall back to the full list if nothing falls in that window (e.g. the
  // target itself is the first test in the course).
  return (sinceLastTest.length > 0 ? sinceLastTest : all).map((a) => a.name);
}
