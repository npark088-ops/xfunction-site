import { createClient } from "../../../../lib/supabase/server";

// "Download my data": everything XFunction stores about the signed-in student,
// as one JSON file. Every query below is filtered to the caller's own rows
// explicitly (not only by row-level security: a linked parent can also read
// their student's courses, and this must never export someone else's data).
//
// Left OUT on purpose: sign-in tokens and secrets of every kind (platform
// access/refresh tokens, Moodle private tokens), Stripe customer and
// subscription ids, and parent invite codes (a code is a way into the account's
// grades, so it does not belong in a file that gets emailed around). Platform
// connections are exported as "connected as <name>, last updated <date>" only.
//
// If one table can't be read (for example a migration that hasn't been run
// yet), the file still downloads; the problem is listed under "warnings"
// instead of being silently dropped.

type Row = Record<string, unknown>;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const warnings: string[] = [];

  // Reads the named columns of `table` where `filterColumn` is this user.
  const read = async (
    table: string,
    columns: string,
    options: { filterColumn?: string; single?: boolean } = {}
  ): Promise<Row[] | Row | null> => {
    const query = supabase.from(table).select(columns).eq(options.filterColumn ?? "user_id", user.id);
    const { data, error } = await query;
    if (error) {
      warnings.push(`${table}: could not be read (${error.message})`);
      return options.single ? null : [];
    }
    const rows = (data ?? []) as unknown as Row[];
    return options.single ? (rows[0] ?? null) : rows;
  };

  const [
    profile,
    courses,
    assignmentGroups,
    assignments,
    assignmentCompletions,
    courseGoals,
    courseNotes,
    courseTeacherNotes,
    scheduleBlocks,
    studyPlans,
    studySessions,
    gradePredictions,
    tasks,
    notifications,
    parentLinksAsStudent,
    parentLinksAsParent,
    canvas,
    googleClassroom,
    schoology,
    moodle,
    blackboard,
  ] = await Promise.all([
    read(
      "profiles",
      "is_pro, grade_level, platform_preference, ai_generations_used, usage_period_start, chat_messages_used, chat_usage_period_start, support_messages_used, support_usage_period_start, current_streak, longest_streak, last_active_date, first_study_plan_at, created_at",
      { single: true }
    ),
    read("courses", "id, name, credit_hours, grading_scale, created_at, updated_at"),
    read("assignment_groups", "id, course_id, name, weight, position, created_at"),
    read("assignments", "id, group_id, name, points_possible, due_at, score, created_at"),
    read("assignment_completions", "assignment_id, completed_at"),
    read("course_goals", "course_id, target_grade, updated_at"),
    read("course_notes", "course_id, content, updated_at"),
    read("course_teacher_notes", "course_id, rating, note, updated_at"),
    read("course_schedule_blocks", "course_id, day_of_week, start_time, end_time, created_at"),
    read("study_plans", "course_id, plan, updated_at"),
    read("study_sessions", "course_id, duration_minutes, occurred_at"),
    read("grade_predictions", "course_id, predicted_grade, percent_graded_at_prediction, created_at"),
    read("tasks", "text, completed, due_date, ai_response, created_at"),
    read("notifications", "type, message, link, read, created_at"),
    // Parent invites this student created (invite_code deliberately omitted).
    read("parent_links", "parent_email, status, created_at, accepted_at, revoked_at", { filterColumn: "student_id" }),
    // Links where this account is the parent viewing a student.
    read("parent_links", "student_email, status, created_at, accepted_at, revoked_at", { filterColumn: "parent_id" }),
    read("canvas_connections", "canvas_user_id, canvas_user_name, updated_at"),
    read("google_classroom_connections", "google_user_id, google_user_name, google_user_email, updated_at"),
    read("schoology_connections", "schoology_user_id, schoology_user_name, updated_at"),
    read("moodle_connections", "site_url, moodle_user_id, moodle_user_name, updated_at"),
    read("blackboard_connections", "blackboard_user_id, blackboard_user_name, updated_at"),
  ]);

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    account: { email: user.email, createdAt: user.created_at },
    profile,
    courses,
    assignmentGroups,
    assignments,
    assignmentCompletions,
    courseGoals,
    courseNotes,
    courseTeacherNotes,
    scheduleBlocks,
    studyPlans,
    studySessions,
    gradePredictions,
    tasks,
    notifications,
    parentLinks: {
      parentInvitesIMade: parentLinksAsStudent,
      studentsIViewAsParent: parentLinksAsParent,
    },
    platformConnections: {
      canvas,
      googleClassroom,
      schoology,
      moodle,
      blackboard,
    },
    note: "Sign-in tokens, secrets, Stripe ids and parent invite codes are intentionally not included.",
    ...(warnings.length > 0 ? { warnings } : {}),
  };

  return new Response(JSON.stringify(exportPayload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="xfunction-data-export.json"`,
    },
  });
}
