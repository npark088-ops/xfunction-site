import { getCachedUser } from "../../lib/supabase/server";
import { Sidebar } from "../../components/Sidebar";

const bg = "#0B1120";

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

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: bg }}>
      <Sidebar userEmail={user?.email ?? null} />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
