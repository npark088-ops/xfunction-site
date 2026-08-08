import type { SupabaseClient } from "@supabase/supabase-js";
import { getCanvasConnection } from "./canvas-token-store";
import { ACHIEVEMENTS, getUnlockedAchievementIds } from "./achievements";
import { getUpcomingAssignments, getDigestAssignments, URGENT_WITHIN_DAYS } from "./upcoming-assignments";
import { ensureNotification } from "./notifications";

// Re-derives "what notifications should exist right now" (achievement
// unlocks + urgent deadlines) and upserts any missing ones — cheap
// per-call since ensureNotification() is a no-op for anything already
// recorded (see the unique constraint in
// supabase/migrations/0007_notifications.sql), but each check is still
// a real Supabase round trip. This used to run inside
// app/(dashboard)/layout.tsx on every single dashboard navigation,
// which meant every click added several redundant upsert attempts on
// top of whatever the destination page itself needed. It's now only
// triggered once per visit, from the Overview page (see
// app/api/notifications/sync and app/(dashboard)/overview/page.tsx) —
// the layout itself only does the cheap read-only notification
// snapshot needed to render the bell correctly everywhere.
export async function syncActivityNotifications(supabase: SupabaseClient, userId: string) {
  const [profileRow, canvasConnection] = await Promise.all([
    supabase
      .from("profiles")
      .select("longest_streak, first_study_plan_at")
      .eq("user_id", userId)
      .maybeSingle(),
    getCanvasConnection(supabase, userId),
  ]);

  const unlocked = getUnlockedAchievementIds({
    longestStreak: profileRow.data?.longest_streak ?? 0,
    hasGeneratedStudyPlan: Boolean(profileRow.data?.first_study_plan_at),
    canvasConnected: Boolean(canvasConnection),
  });

  await Promise.all(
    ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).map((a) =>
      ensureNotification(supabase, {
        type: "achievement",
        message: `Achievement unlocked: ${a.name}`,
        link: "/settings",
        dedupeKey: `achievement:${a.id}`,
      })
    )
  );

  // Genuinely urgent (due within URGENT_WITHIN_DAYS) — each gets its
  // own notification, same as before.
  const urgent = getUpcomingAssignments(URGENT_WITHIN_DAYS);
  await Promise.all(
    urgent.map((item) =>
      ensureNotification(supabase, {
        type: "deadline",
        message: `${item.assignmentName} (${item.courseName}) is due ${item.daysAway <= 0 ? "today" : `in ${item.daysAway} day${item.daysAway === 1 ? "" : "s"}`}`,
        link: `/grades/${item.courseId}`,
        dedupeKey: `deadline:${item.courseId}:${item.assignmentId}`,
      })
    )
  );

  // Everything else due this week (3-7 days out) gets batched into ONE
  // notification instead of one per assignment — dedupeKey includes
  // today's date so it's a fresh digest each day rather than a single
  // notification that silently goes stale as the underlying list
  // changes. ensureNotification's ignoreDuplicates means this only
  // actually inserts once per day, even though sync runs on every visit.
  const digestItems = getDigestAssignments();
  if (digestItems.length > 0) {
    const preview = digestItems.slice(0, 3).map((item) => item.assignmentName);
    const overflow = digestItems.length - preview.length;
    const message = `${digestItems.length} more assignment${digestItems.length === 1 ? "" : "s"} due this week: ${preview.join(", ")}${overflow > 0 ? `, +${overflow} more` : ""}`;
    await ensureNotification(supabase, {
      type: "digest",
      message,
      link: "/overview",
      dedupeKey: `digest:${new Date().toISOString().slice(0, 10)}`,
    });
  }
}
