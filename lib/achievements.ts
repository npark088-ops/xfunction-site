import type { SupabaseClient } from "@supabase/supabase-js";
import { ClipboardList, Flame, Award, Link2, type LucideIcon } from "lucide-react";
import { mockCourses } from "./mock-canvas-data";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

export const ACHIEVEMENTS: Achievement[] = [
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

export interface AchievementContext {
  longestStreak: number;
  hasGeneratedStudyPlan: boolean;
  canvasConnected: boolean;
}

// "First A" is derived live from the (shared, mock) grade data rather
// than persisted — there's no per-user Canvas data yet, so whether
// this is unlocked is the same fact for every account right now.
export function hasScoredAtOrAbove(threshold: number): boolean {
  for (const course of Object.values(mockCourses)) {
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
  if (hasScoredAtOrAbove(90)) unlocked.add("first-a");
  if (ctx.canvasConnected) unlocked.add("canvas-connected");
  return unlocked;
}

// Called from app/api/study-plan on a successful generation. Only sets
// the timestamp the first time — never overwrites it — since this is
// meant to record when the achievement was first earned.
export async function markFirstStudyPlanGenerated(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("first_study_plan_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.first_study_plan_at) return;

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, first_study_plan_at: new Date().toISOString() });

  if (error) console.error("markFirstStudyPlanGenerated failed:", error);
}
