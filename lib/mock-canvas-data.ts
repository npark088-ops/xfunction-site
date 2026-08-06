import { CanvasAssignmentGroup } from "./canvas-types";
import { GradingScale, SIMPLE_GRADING_SCALE } from "./grading-scale";

// Fake data shaped exactly like what Canvas's real API returns.
// This lets us build and test the whole grade-calculator pipeline
// without needing live Canvas access. Swap this for a real fetch()
// to the Canvas API later — nothing downstream needs to change.

// The three "(upcoming)" assignments below need to stay in the future
// relative to whenever the app actually runs, or the Coming Up list
// (and the email/text reminder buttons, which only show up when
// something's due soon) silently go empty as real time passes. Fixed
// calendar dates bit us once already — this keeps them anchored to
// "today" instead.
function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 0, 0);
  return date.toISOString();
}

export interface MockCourse {
  id: string;
  name: string;
  assignmentGroups: CanvasAssignmentGroup[];
  // Used to weight this course's contribution to the overall grade —
  // see lib/grade-calculator.ts's calculateWeightedOverallGrade().
  // Defaults to 1.0 (getCreditHours() below) for any course that
  // doesn't set one explicitly.
  creditHours?: number;
  // Percentage → letter grade mapping. Defaults to
  // STANDARD_GRADING_SCALE (see lib/grading-scale.ts) if omitted —
  // not every course has to grade on the same scale.
  gradingScale?: GradingScale;
}

export function getCreditHours(course: MockCourse): number {
  return course.creditHours ?? 1.0;
}

// "AP Biology" — weighted grading: Homework 20%, Quizzes 30%, Tests 50%
const apBiologyGroups: CanvasAssignmentGroup[] = [
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
        due_at: daysFromNow(1),
        // this is the assignment we'll ask "what do I need to score on this?"
        submission: null as any,
      },
    ],
  },
];

// "US History" — weighted grading: Homework 20%, Quizzes 25%, Essays 25%, Tests 30%
const usHistoryGroups: CanvasAssignmentGroup[] = [
  {
    id: 1,
    name: "Homework",
    group_weight: 20,
    assignments: [
      {
        id: 111,
        name: "Reading Response: Manifest Destiny",
        points_possible: 10,
        due_at: "2026-07-02T23:59:00Z",
        submission: { score: 9, submitted_at: "2026-07-01T19:00:00Z", workflow_state: "graded" },
      },
      {
        id: 112,
        name: "Primary Source Analysis",
        points_possible: 10,
        due_at: "2026-07-09T23:59:00Z",
        submission: { score: 7, submitted_at: "2026-07-08T21:00:00Z", workflow_state: "graded" },
      },
    ],
  },
  {
    id: 2,
    name: "Quizzes",
    group_weight: 25,
    assignments: [
      {
        id: 211,
        name: "Quiz 1: Colonial America",
        points_possible: 20,
        due_at: "2026-07-06T23:59:00Z",
        submission: { score: 15, submitted_at: "2026-07-06T15:00:00Z", workflow_state: "graded" },
      },
      {
        id: 212,
        name: "Quiz 2: Civil War",
        points_possible: 20,
        due_at: "2026-07-22T23:59:00Z",
        // not graded yet
        submission: null as any,
      },
    ],
  },
  {
    id: 3,
    name: "Essays",
    group_weight: 25,
    assignments: [
      {
        id: 311,
        name: "DBQ: Industrial Revolution",
        points_possible: 50,
        due_at: "2026-07-14T23:59:00Z",
        submission: { score: 41, submitted_at: "2026-07-13T22:00:00Z", workflow_state: "graded" },
      },
    ],
  },
  {
    id: 4,
    name: "Tests",
    group_weight: 30,
    assignments: [
      {
        id: 411,
        name: "Midterm Exam",
        points_possible: 100,
        due_at: "2026-07-11T23:59:00Z",
        submission: { score: 74, submitted_at: "2026-07-11T14:00:00Z", workflow_state: "graded" },
      },
      {
        id: 412,
        name: "Unit 4 Test (upcoming)",
        points_possible: 100,
        due_at: daysFromNow(4),
        // this is the assignment we'll ask "what do I need to score on this?"
        submission: null as any,
      },
    ],
  },
];

// "Algebra II" — weighted grading: Homework 15%, Quizzes 25%, Tests 60%
const algebra2Groups: CanvasAssignmentGroup[] = [
  {
    id: 1,
    name: "Homework",
    group_weight: 15,
    assignments: [
      {
        id: 121,
        name: "Section 4.2 Problems",
        points_possible: 10,
        due_at: "2026-07-03T23:59:00Z",
        submission: { score: 10, submitted_at: "2026-07-02T20:00:00Z", workflow_state: "graded" },
      },
      {
        id: 122,
        name: "Section 4.3 Problems",
        points_possible: 10,
        due_at: "2026-07-10T23:59:00Z",
        submission: { score: 8, submitted_at: "2026-07-09T18:00:00Z", workflow_state: "graded" },
      },
    ],
  },
  {
    id: 2,
    name: "Quizzes",
    group_weight: 25,
    assignments: [
      {
        id: 221,
        name: "Quiz: Polynomial Functions",
        points_possible: 25,
        due_at: "2026-07-07T23:59:00Z",
        submission: { score: 20, submitted_at: "2026-07-07T15:00:00Z", workflow_state: "graded" },
      },
      {
        id: 222,
        name: "Quiz: Rational Expressions",
        points_possible: 25,
        due_at: "2026-07-21T23:59:00Z",
        // not graded yet
        submission: null as any,
      },
    ],
  },
  {
    id: 3,
    name: "Tests",
    group_weight: 60,
    assignments: [
      {
        id: 321,
        name: "Unit 3 Test: Exponentials",
        points_possible: 100,
        due_at: "2026-07-12T23:59:00Z",
        submission: { score: 88, submitted_at: "2026-07-12T14:00:00Z", workflow_state: "graded" },
      },
      {
        id: 322,
        name: "Unit 4 Test: Logarithms (upcoming)",
        points_possible: 100,
        due_at: daysFromNow(2),
        // this is the assignment we'll ask "what do I need to score on this?"
        submission: null as any,
      },
    ],
  },
];

export const mockCourses: Record<string, MockCourse> = {
  // AP courses commonly carry extra weight toward a student's overall
  // average — 1.5 credit hours here vs. the standard 1.0, so the
  // credit-weighted overall grade isn't just a plain average anymore.
  "ap-biology": {
    id: "ap-biology",
    name: "AP Biology",
    assignmentGroups: apBiologyGroups,
    creditHours: 1.5,
  },
  "us-history": {
    id: "us-history",
    name: "US History",
    assignmentGroups: usHistoryGroups,
    creditHours: 1.0,
  },
  // Uses a simplified (no +/-) grading scale, unlike the other two
  // courses — demonstrates that a course can define its own scale.
  "algebra-2": {
    id: "algebra-2",
    name: "Algebra II",
    assignmentGroups: algebra2Groups,
    creditHours: 1.0,
    gradingScale: SIMPLE_GRADING_SCALE,
  },
};

// Kept for lib/test-calculator.ts, which exercises the calculator against a single course.
export const mockAssignmentGroups = apBiologyGroups;
