"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const bg = "#0B1120";
const card = "#141B2E";
const border = "#232C45";
const cyan = "#5EEAD4";
const textDim = "#8B94AC";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview" },
  { href: "/courses", label: "Courses" },
  { href: "/tasks", label: "Tasks" },
  { href: "/settings", label: "Settings" },
];

// userEmail comes from the server (see app/(dashboard)/layout.tsx) so
// this never has to fetch it itself — no client-side round trip, no
// flash of a missing email/sign-out button on first paint.
export function Sidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        background: card,
        borderRight: `1px solid ${border}`,
        minHeight: "100vh",
        padding: "28px 20px",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
      }}
    >
      <Link
        href="/"
        style={{
          color: cyan,
          fontSize: 18,
          fontWeight: 700,
          textDecoration: "none",
          marginBottom: 36,
          display: "inline-block",
        }}
      >
        xFunction
      </Link>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.href === "/courses" && pathname.startsWith("/grades"));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                color: active ? bg : "white",
                background: active ? cyan : "transparent",
                transition: "background 0.15s ease, color 0.15s ease",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {userEmail && (
        <div style={{ borderTop: `1px solid ${border}`, paddingTop: 16, marginTop: 16 }}>
          <div
            style={{
              fontSize: 12,
              color: textDim,
              marginBottom: 10,
              wordBreak: "break-all",
            }}
          >
            {userEmail}
          </div>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "8px 14px",
                borderRadius: 8,
                background: bg,
                border: `1px solid ${border}`,
                color: "white",
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
  );
}
