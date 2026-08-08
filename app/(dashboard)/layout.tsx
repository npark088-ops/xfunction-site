import { getCachedUser, createClient } from "../../lib/supabase/server";
import { Sidebar } from "../../components/Sidebar";
import { ToastProvider } from "../../components/ToastProvider";
import { ToastWatcher } from "../../components/ToastWatcher";
import { OnboardingTour } from "../../components/OnboardingTour";
import { getNotificationsSnapshot } from "../../lib/notifications";

const bg = "var(--bg)";

// Shared shell for every signed-in page (Overview, Courses, Tasks,
// Settings, Grades). Fetching the user here — once, server-side —
// means the sidebar renders with the right email/sign-out state on
// the very first paint, no client fetch or loading flash, and pages
// nested inside that also need the user (e.g. Courses, Settings) hit
// the cached result instead of re-querying Supabase.
//
// Deliberately kept cheap: this runs on EVERY dashboard navigation
// (Overview, Courses, Grades, Search, Compare, Ask, Settings, ...), so
// it only does the two read-only queries the sidebar actually needs to
// render correctly (notification snapshot for the bell, parent-link
// count for the "Parent view" link) — both fired in parallel. The
// heavier achievement/deadline notification *sync* (which upserts,
// not just reads) used to run here too on every navigation; it's now
// only triggered once per visit from the Overview page — see
// lib/activity-notifications.ts.
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
    const [notificationsSnapshot, parentLinksCount] = await Promise.all([
      getNotificationsSnapshot(supabase),
      supabase
        .from("parent_links")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", user.id)
        .eq("status", "active"),
    ]);
    notifications = notificationsSnapshot;
    hasParentAccess = (parentLinksCount.count ?? 0) > 0;
  }

  return (
    <ToastProvider>
      {user && <ToastWatcher />}
      {user && <OnboardingTour />}
      <div style={{ display: "flex", minHeight: "100vh", background: bg }}>
        <Sidebar
          userId={user?.id ?? null}
          userEmail={user?.email ?? null}
          initialNotifications={notifications.notifications}
          initialUnreadCount={notifications.unreadCount}
          hasParentAccess={hasParentAccess}
        />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </ToastProvider>
  );
}
