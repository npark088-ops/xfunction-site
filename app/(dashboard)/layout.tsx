import { getCachedUser, createClient } from "../../lib/supabase/server";
import { Sidebar } from "../../components/Sidebar";
import { getCanvasConnection } from "../../lib/canvas-token-store";
import { ACHIEVEMENTS, getUnlockedAchievementIds } from "../../lib/achievements";
import { getUpcomingAssignments, URGENT_WITHIN_DAYS } from "../../lib/upcoming-assignments";
import { ensureNotification, getNotificationsSnapshot } from "../../lib/notifications";
import type { SupabaseClient } from "@supabase/supabase-js";

const bg = "var(--bg)";

// Re-derives "what notifications should exist right now" on every
// dashboard page load and upserts any missing ones — cheap since
// ensureNotification() is a no-op for anything already recorded (see
// the unique constraint in supabase/migrations/0007_notifications.sql).
// Keeps notification state in sync without needing a scattered set of
// insert-on-event calls at every place an achievement could unlock.
async function syncActivityNotifications(supabase: SupabaseClient, userId: string) {
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
}

// Shared shell for every signed-in page (Overview, Courses, Tasks,
// Settings, Grades). Fetching the user here — once, server-side —
// means the sidebar renders with the right email/sign-out state on
// the very first paint, no client fetch or loading flash, and pages
// nested inside that also need the user (e.g. Courses, Settings) hit
// the cached result instead of re-querying Supabase.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedUser();

  let notifications: Awaited<ReturnType<typeof getNotificationsSnapshot>> = {
    notifications: [],
    unreadCount: 0,
  };
  let hasParentAccess = false;

  if (user) {
    const supabase = await createClient();
    await syncActivityNotifications(supabase, user.id);
    notifications = await getNotificationsSnapshot(supabase);

    const { count } = await supabase
      .from("parent_links")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", user.id)
      .eq("status", "active");
    hasParentAccess = (count ?? 0) > 0;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: bg }}>
      <Sidebar
        userEmail={user?.email ?? null}
        initialNotifications={notifications.notifications}
        initialUnreadCount={notifications.unreadCount}
        hasParentAccess={hasParentAccess}
      />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
