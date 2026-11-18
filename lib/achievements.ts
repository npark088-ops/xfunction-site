import { ClipboardList, Flame, Award, Link2, type LucideIcon } from "lucide-react";
import type { MockCourse } from "./mock-canvas-data";
import { PLATFORM_IMPORT_AVAILABLE } from "./platforms";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-study-plan",
    name: "First study plan generated",
    description: "Generate your first AI study plan.",
    icon: ClipboardList,
  },
  {
    id: "week-streak",
    name: "7-day streak",
    description: "Use XFunction 7 days in a row.",
    icon: Flame,
  },
  {
    id: "first-a",
    name: "First A on a test",
    description: "Score 90% or higher on a graded assignment.",
    icon: Award,
  },
  {
    id: "canvas-connected",
    name: "Connected Canvas",
    description: "Link your Canvas account.",
    icon: Link2,
  },
];

// "Connected Canvas" can't be earned while connecting a platform does nothing
// useful (a saved sign-in token alone is not an achievement), so it is left
// out of the list students see until PLATFORM_IMPORT_AVAILABLE is true. The
// definition above is kept for that day.
export const ACHIEVEMENTS: Achievement[] = ALL_ACHIEVEMENTS.filter(
  (a) => a.id !== "canvas-connected" || PLATFORM_IMPORT_AVAILABLE
);

export interface AchievementContext {
  longestStreak: number;
  hasGeneratedStudyPlan: boolean;
  canvasConnected: boolean;
  courses: Record<string, MockCourse>;
}

// "First A" is derived live from the student's real course data (see
// lib/user-courses.ts) rather than persisted — checked fresh every time
// instead of stored, since it can flip from unlocked back to "would no
// longer qualify" if a course/assignment is edited or deleted, and
// there's no need to reconcile that — just recompute.
export function hasScoredAtOrAbove(courses: Record<string, MockCourse>, threshold: number): boolean {
  for (const course of Object.values(courses)) {
    for (const group of course.assignmentGroups) {
      for (const assignment of group.assignments) {
        const score = assignment.submission?.score;
        if (score != null && assignment.points_possible > 0) {
          const percentage = (score / assignment.points_possible) * 100;
          if (percentage >= threshold) return true;
        }
      }
    }
  }
  return false;
}

export function getUnlockedAchievementIds(ctx: AchievementContext): Set<string> {
  const unlocked = new Set<string>();
  if (ctx.hasGeneratedStudyPlan) unlocked.add("first-study-plan");
  if (ctx.longestStreak >= 7) unlocked.add("week-streak");
  if (hasScoredAtOrAbove(ctx.courses, 90)) unlocked.add("first-a");
  // Needs real imported data, not just a saved token.
  if (PLATFORM_IMPORT_AVAILABLE && ctx.canvasConnected) unlocked.add("canvas-connected");
  return unlocked;
}

// markFirstStudyPlanGenerated (the write that sets first_study_plan_at) lives in
// lib/profile-server.ts: signed-in users can't write their own profile, so it
// runs server-side with the admin client.
