import { CanvasAssignmentGroup } from "./canvas-types";

// Fake data shaped exactly like what Canvas's real API returns.
// This lets us build and test the whole grade-calculator pipeline
// without needing live Canvas access. Swap this for a real fetch()
// to the Canvas API later — nothing downstream needs to change.

// Example course: "AP Biology" — weighted grading:
// Homework 20%, Quizzes 30%, Tests 50%
export const mockAssignmentGroups: CanvasAssignmentGroup[] = [
  {
    id: 1,
    name: "Homework",
    group_weight: 20,
    assignments: [
      {
        id: 101,
        name: "Cell Structure Worksheet",
        points_possible: 10,
        due_at: "2026-07-01T23:59:00Z",
        submission: { score: 9, submitted_at: "2026-06-30T20:00:00Z", workflow_state: "graded" },
      },
      {
        id: 102,
        name: "Photosynthesis Diagram",
        points_possible: 10,
        due_at: "2026-07-08T23:59:00Z",
        submission: { score: 8, submitted_at: "2026-07-07T18:00:00Z", workflow_state: "graded" },
      },
    ],
  },
  {
    id: 2,
    name: "Quizzes",
    group_weight: 30,
    assignments: [
      {
        id: 201,
        name: "Quiz 1: Cell Biology",
        points_possible: 20,
        due_at: "2026-07-05T23:59:00Z",
        submission: { score: 16, submitted_at: "2026-07-05T15:00:00Z", workflow_state: "graded" },
      },
      {
        id: 202,
        name: "Quiz 2: Genetics",
        points_possible: 20,
        due_at: "2026-07-20T23:59:00Z",
        // not graded yet — student hasn't taken it
        submission: null as any,
      },
    ],
  },
  {
    id: 3,
    name: "Tests",
    group_weight: 50,
    assignments: [
      {
        id: 301,
        name: "Unit 1 Test",
        points_possible: 100,
        due_at: "2026-07-10T23:59:00Z",
        submission: { score: 78, submitted_at: "2026-07-10T14:00:00Z", workflow_state: "graded" },
      },
      {
        id: 302,
        name: "Unit 2 Test (upcoming)",
        points_possible: 100,
        due_at: "2026-08-01T23:59:00Z",
        // this is the assignment we'll ask "what do I need to score on this?"
        submission: null as any,
      },
    ],
  },
];
