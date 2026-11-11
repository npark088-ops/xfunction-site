import type { SupabaseClient } from "@supabase/supabase-js";
import { MockCourse, mockCourses, getCreditHours } from "./mock-canvas-data";
import { CanvasAssignmentGroup, CanvasAssignment } from "./canvas-types";
import { GradingScale, STANDARD_GRADING_SCALE, SIMPLE_GRADING_SCALE } from "./grading-scale";

// Real per-user course data, backed by the courses/assignment_groups/
// assignments tables (see supabase/migrations/0022_manual_courses.sql).
// This is the app's actual source of truth now — lib/mock-canvas-data.ts's
// mockCourses only still exists as the literal content copied by
// seedDemoData() below, for a student who explicitly clicks "Load demo
// data" on an empty account.
//
// getUserCourses() returns the exact same shape mockCourses always
// was — Record<string, MockCourse> — so every calculator, chart, and
// page built against that shape (grade-calculator, grade-projection,
// grade-history, course-colors, etc.) needed zero changes to their own
// internals; only their DATA SOURCE changed.

function scaleForKey(key: string): GradingScale {
  return key === "simple" ? SIMPLE_GRADING_SCALE : STANDARD_GRADING_SCALE;
}

function keyForScale(scale: GradingScale | undefined): "standard" | "simple" {
  return scale?.name === SIMPLE_GRADING_SCALE.name ? "simple" : "standard";
}

interface CourseRow {
  id: string;
  name: string;
  credit_hours: number;
  grading_scale: string;
}

interface GroupRow {
  id: number;
  course_id: string;
  name: string;
  weight: number;
}

interface AssignmentRow {
  id: number;
  group_id: number;
  name: string;
  points_possible: number;
  due_at: string | null;
  score: number | null;
}

export async function getUserCourses(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<string, MockCourse>> {
  const [coursesRes, groupsRes, assignmentsRes] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, credit_hours, grading_scale")
      .eq("user_id", userId)
      .order("created_at"),
    supabase
      .from("assignment_groups")
      .select("id, course_id, name, weight")
      .eq("user_id", userId)
      .order("position"),
    supabase
      .from("assignments")
      .select("id, group_id, name, points_possible, due_at, score")
      .eq("user_id", userId)
      .order("due_at"),
  ]);

  const courseRows = (coursesRes.data ?? []) as CourseRow[];
  const groupRows = (groupsRes.data ?? []) as GroupRow[];
  const assignmentRows = (assignmentsRes.data ?? []) as AssignmentRow[];

  const result: Record<string, MockCourse> = {};

  for (const c of courseRows) {
    const groups: CanvasAssignmentGroup[] = groupRows
      .filter((g) => g.course_id === c.id)
      .map((g) => ({
        id: g.id,
        name: g.name,
        group_weight: g.weight,
        assignments: assignmentRows
          .filter((a) => a.group_id === g.id)
          .map(
            (a): CanvasAssignment => ({
              id: a.id,
              name: a.name,
              points_possible: a.points_possible,
              due_at: a.due_at,
              submission:
                a.score != null
                  ? { score: a.score, submitted_at: null, workflow_state: "graded" }
                  : undefined,
            })
          ),
      }));

    result[c.id] = {
      id: c.id,
      name: c.name,
      assignmentGroups: groups,
      creditHours: c.credit_hours,
      gradingScale: scaleForKey(c.grading_scale),
    };
  }

  return result;
}

export async function createCourse(
  supabase: SupabaseClient,
  userId: string,
  input: { name: string; creditHours: number; gradingScale: "standard" | "simple" }
): Promise<string> {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("courses").insert({
    id,
    user_id: userId,
    name: input.name,
    credit_hours: input.creditHours,
    grading_scale: input.gradingScale,
  });
  if (error) throw error;
  return id;
}

export async function updateCourse(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
  input: { name?: string; creditHours?: number; gradingScale?: "standard" | "simple" }
): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.creditHours !== undefined ? { credit_hours: input.creditHours } : {}),
      ...(input.gradingScale !== undefined ? { grading_scale: input.gradingScale } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId)
    .eq("user_id", userId);
  if (error) throw error;
}

// FK ON DELETE CASCADE handles the course's groups/assignments.
export async function deleteCourse(
  supabase: SupabaseClient,
  userId: string,
  courseId: string
): Promise<void> {
  const { error } = await supabase.from("courses").delete().eq("id", courseId).eq("user_id", userId);
  if (error) throw error;
}

export async function createGroup(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
  input: { name: string; weight: number; position?: number }
): Promise<number> {
  const { data, error } = await supabase
    .from("assignment_groups")
    .insert({
      course_id: courseId,
      user_id: userId,
      name: input.name,
      weight: input.weight,
      position: input.position ?? 0,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Failed to create assignment group");
  return data.id;
}

export async function updateGroup(
  supabase: SupabaseClient,
  userId: string,
  groupId: number,
  input: { name?: string; weight?: number }
): Promise<void> {
  const { error } = await supabase
    .from("assignment_groups")
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.weight !== undefined ? { weight: input.weight } : {}),
    })
    .eq("id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteGroup(
  supabase: SupabaseClient,
  userId: string,
  groupId: number
): Promise<void> {
  const { error } = await supabase
    .from("assignment_groups")
    .delete()
    .eq("id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function createAssignment(
  supabase: SupabaseClient,
  userId: string,
  groupId: number,
  input: { name: string; pointsPossible: number; dueAt: string | null; score: number | null }
): Promise<number> {
  const { data, error } = await supabase
    .from("assignments")
    .insert({
      group_id: groupId,
      user_id: userId,
      name: input.name,
      points_possible: input.pointsPossible,
      due_at: input.dueAt,
      score: input.score,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Failed to create assignment");
  return data.id;
}

export async function updateAssignment(
  supabase: SupabaseClient,
  userId: string,
  assignmentId: number,
  input: { name?: string; pointsPossible?: number; dueAt?: string | null; score?: number | null }
): Promise<void> {
  const { error } = await supabase
    .from("assignments")
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.pointsPossible !== undefined ? { points_possible: input.pointsPossible } : {}),
      ...(input.dueAt !== undefined ? { due_at: input.dueAt } : {}),
      ...(input.score !== undefined ? { score: input.score } : {}),
    })
    .eq("id", assignmentId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteAssignment(
  supabase: SupabaseClient,
  userId: string,
  assignmentId: number
): Promise<void> {
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("user_id", userId);
  if (error) throw error;
}

// The "Load demo data" action (see components/AddCourseCard.tsx) — only
// allowed on a genuinely empty account, so it always reads as "here's a
// starting point," never as silently merging fake courses into a
// student's real ones. Copies lib/mock-canvas-data.ts's 3 courses
// verbatim, INCLUDING their original string ids — see the migration
// file's comment for why that id reuse matters.
export async function seedDemoData(supabase: SupabaseClient, userId: string): Promise<void> {
  const { count, error: countError } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error("Demo data can only be loaded into an empty course list.");
  }

  for (const course of Object.values(mockCourses)) {
    const { error: courseError } = await supabase.from("courses").insert({
      id: course.id,
      user_id: userId,
      name: course.name,
      credit_hours: getCreditHours(course),
      grading_scale: keyForScale(course.gradingScale),
    });
    if (courseError) throw courseError;

    for (const group of course.assignmentGroups) {
      const { data: groupRow, error: groupError } = await supabase
        .from("assignment_groups")
        .insert({
          course_id: course.id,
          user_id: userId,
          name: group.name,
          weight: group.group_weight,
        })
        .select("id")
        .single();
      if (groupError || !groupRow) throw groupError ?? new Error("Failed to seed assignment group");

      if (group.assignments.length === 0) continue;
      const { error: assignmentsError } = await supabase.from("assignments").insert(
        group.assignments.map((a) => ({
          group_id: groupRow.id,
          user_id: userId,
          name: a.name,
          points_possible: a.points_possible,
          due_at: a.due_at,
          score: a.submission?.score ?? null,
        }))
      );
      if (assignmentsError) throw assignmentsError;
    }
  }
}
