import { createClient } from "../../../../lib/supabase/server";

// Every table queried here is scoped to the caller by RLS
// (auth.uid() = user_id) — this just gathers all of it into one
// downloadable file rather than making the user hunt through Settings.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const [profile, tasks, canvasConnection, assignmentCompletions, courseNotes, notifications] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "is_pro, ai_generations_used, usage_period_start, current_streak, longest_streak, last_active_date, first_study_plan_at"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("tasks").select("text, completed, due_date, ai_response, created_at"),
      supabase
        .from("canvas_connections")
        .select("canvas_user_id, canvas_user_name, updated_at")
        .maybeSingle(),
      supabase.from("assignment_completions").select("assignment_id"),
      supabase.from("course_notes").select("course_id, content, updated_at"),
      supabase.from("notifications").select("type, message, read, created_at"),
    ]);

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    account: { email: user.email, createdAt: user.created_at },
    profile: profile.data ?? null,
    tasks: tasks.data ?? [],
    canvasConnection: canvasConnection.data ?? null,
    assignmentCompletions: assignmentCompletions.data ?? [],
    courseNotes: courseNotes.data ?? [],
    notifications: notifications.data ?? [],
  };

  return new Response(JSON.stringify(exportPayload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="xfunction-data-export.json"`,
    },
  });
}
