import { createClient } from "../../../lib/supabase/server";
import { mockCourses } from "../../../lib/mock-canvas-data";
import { getCanvasConnection } from "../../../lib/canvas-token-store";
import { ACHIEVEMENTS, getUnlockedAchievementIds } from "../../../lib/achievements";
import { ensureNotification } from "../../../lib/notifications";

interface StoredStudyPlan {
  days?: { date?: string; tasks?: string[] }[];
}

// Backs the in-app toast watcher (components/ToastWatcher.tsx) — the
// two toast triggers that need real per-user data (an assignment due
// within 24h is pure static mock data and gets checked client-side
// instead, see lib/upcoming-assignments.ts's getUrgentWithin24Hours).
//
// Both checks here are self-deduping so the watcher can just call this
// once per app load without its own server-side dedup logic:
//   - newAchievements uses its own "toast-achievement:" dedupe_key
//     prefix — deliberately NOT the plain "achievement:" prefix that
//     lib/activity-notifications.ts writes for the bell entry. Both
//     that sync and this route can fire on the same initial page load
//     (Overview's effect and this one, mounted in the layout, aren't
//     ordered relative to each other); sharing one dedupe key meant
//     whichever request happened to resolve first "claimed" it, so the
//     bell entry would appear but the celebration toast would silently
//     never fire whenever the sync request won the race. Separate
//     prefixes mean the two can never race each other.
//   - plannedNotStarted is naturally self-limiting: once a session is
//     logged for a course today, that course stops appearing.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStr = todayStart.toISOString().slice(0, 10);

  const [profileRow, canvasConnection, existingAchievementNotifs, plansResult, sessionsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("longest_streak, first_study_plan_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      getCanvasConnection(supabase, user.id),
      supabase.from("notifications").select("dedupe_key").like("dedupe_key", "toast-achievement:%"),
      supabase.from("study_plans").select("course_id, plan"),
      supabase
        .from("study_sessions")
        .select("course_id")
        .gte("occurred_at", todayStart.toISOString()),
    ]);

  // --- Newly unlocked achievements ---
  const unlocked = getUnlockedAchievementIds({
    longestStreak: profileRow.data?.longest_streak ?? 0,
    hasGeneratedStudyPlan: Boolean(profileRow.data?.first_study_plan_at),
    canvasConnected: Boolean(canvasConnection),
  });
  const alreadyToasted = new Set(
    (existingAchievementNotifs.data ?? []).map((n) => n.dedupe_key.replace("toast-achievement:", ""))
  );
  const newlyUnlocked = ACHIEVEMENTS.filter((a) => unlocked.has(a.id) && !alreadyToasted.has(a.id));

  // Records that this achievement's celebration toast has been shown —
  // a separate row from the bell notification (see
  // lib/activity-notifications.ts), not a replacement for it. The bell
  // entry is still the persistent history; this is only "has the
  // pop-up fired," and reuses the notifications table purely because
  // it already has the right shape (per-user, dedupe_key-unique), not
  // because it's meant to show up in the bell dropdown itself.
  await Promise.all(
    newlyUnlocked.map((a) =>
      ensureNotification(supabase, {
        type: "achievement",
        message: `Achievement unlocked: ${a.name}`,
        link: "/settings",
        dedupeKey: `toast-achievement:${a.id}`,
      })
    )
  );

  // --- Planned study today, not yet started ---
  const sessionCourseIdsToday = new Set((sessionsResult.data ?? []).map((s) => s.course_id));
  const plannedNotStarted = (plansResult.data ?? [])
    .map((row) => {
      const plan = row.plan as StoredStudyPlan | null;
      const day = plan?.days?.find((d) => d.date === todayStr);
      if (!day || !day.tasks || day.tasks.length === 0) return null;
      if (sessionCourseIdsToday.has(row.course_id)) return null;
      return { courseId: row.course_id as string, courseName: mockCourses[row.course_id]?.name ?? row.course_id };
    })
    .filter((x): x is { courseId: string; courseName: string } => x !== null);

  return Response.json({
    newAchievements: newlyUnlocked.map((a) => ({ id: a.id, name: a.name })),
    plannedNotStarted,
  });
}
