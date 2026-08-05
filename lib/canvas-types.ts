// Types matching the real Canvas LMS REST API response shapes.
// Docs: https://canvas.instructure.com/doc/api/
// Keeping these accurate means swapping mock data for the real API later
// requires zero changes to the calculator or UI logic below.

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  enrollments?: CanvasEnrollment[];
}

export interface CanvasEnrollment {
  type: "student" | "teacher" | "ta" | "observer";
  // Canvas returns the student's current computed grade/score here
  grades?: {
    current_score: number | null; // e.g. 87.5
    current_grade: string | null; // e.g. "B+"
    final_score: number | null;
    final_grade: string | null;
  };
}

// An "assignment group" is Canvas's term for a grading category,
// e.g. "Homework" (20%), "Tests" (50%), "Participation" (30%)
export interface CanvasAssignmentGroup {
  id: number;
  name: string;
  group_weight: number; // percentage weight of this category, e.g. 20
  assignments: CanvasAssignment[];
}

export interface CanvasAssignment {
  id: number;
  name: string;
  points_possible: number;
  due_at: string | null; // ISO date string
  // The logged-in student's own submission, if Canvas include[]=submission was used
  submission?: CanvasSubmission;
}

export interface CanvasSubmission {
  score: number | null; // null = not graded/submitted yet
  submitted_at: string | null;
  workflow_state: "submitted" | "graded" | "unsubmitted" | "pending_review";
}

// Response shape from POST /login/oauth2/token, per Canvas's OAuth2 docs:
// https://canvas.instructure.com/doc/api/file.oauth.html
export interface CanvasOAuthTokenResponse {
  access_token: string;
  token_type: "Bearer";
  user: {
    id: number;
    name: string;
  };
  refresh_token?: string;
  expires_in?: number;
}
