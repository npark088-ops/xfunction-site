import Link from "next/link";
import { getCachedUser } from "../../lib/supabase/server";

const bg = "var(--bg)";
const border = "var(--border)";
const blue = "var(--blue)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

// Deliberately separate from the (dashboard) route group's Sidebar —
// a parent viewer shouldn't see student-only nav (Tasks, Notes,
// Settings, AI generation). Just enough chrome to orient and sign out.
export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCachedUser();

  return (
    <div style={{ minHeight: "100vh", background: bg }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 40px",
          borderBottom: `1px solid ${border}`,
        }}
      >
        <Link href="/parent" style={{ color: blue, fontSize: 18, fontWeight: 700, textDecoration: "none" }}>
          xFunction <span style={{ color: textDim, fontWeight: 500, fontSize: 13 }}>· Parent view</span>
        </Link>
        {user?.email && (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 13, color: textDim }}>{user.email}</span>
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                style={{
                  padding: "7px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "transparent",
                  border: `1px solid ${border}`,
                  color: text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
