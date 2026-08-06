"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, CalendarDays, ListTodo, Settings as SettingsIcon, HelpCircle, LogOut, Users } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import type { NotificationRow } from "../lib/notifications";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
  { href: "/help", label: "Help", icon: HelpCircle },
];

// userEmail comes from the server (see app/(dashboard)/layout.tsx) so
// this never has to fetch it itself — no client-side round trip, no
// flash of a missing email/sign-out button on first paint. Same for
// the notification snapshot, which also seeds the bell dropdown.
export function Sidebar({
  userEmail,
  initialNotifications,
  initialUnreadCount,
  hasParentAccess,
}: {
  userEmail: string | null;
  initialNotifications: NotificationRow[];
  initialUnreadCount: number;
  hasParentAccess: boolean;
}) {
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 36,
        }}
      >
        <Link
          href="/"
          style={{
            color: blue,
            fontSize: 18,
            fontWeight: 700,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          xFunction
        </Link>
        <NotificationBell
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
        />
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.href === "/courses" && pathname.startsWith("/grades"));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "var(--border)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                color: active ? "white" : text,
                background: active ? blue : "transparent",
                transition: "background var(--transition-fast), color var(--transition-fast)",
              }}
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {hasParentAccess && (
        <Link
          href="/parent"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            color: textDim,
            border: `1px dashed ${border}`,
            marginTop: 8,
          }}
        >
          <Users size={15} strokeWidth={2} />
          Parent view
        </Link>
      )}

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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: "var(--radius-sm)",
                background: bg,
                border: `1px solid ${border}`,
                color: text,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <LogOut size={15} strokeWidth={2} />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
