"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { LayoutDashboard, BookOpen, CalendarDays, ListTodo, Settings as SettingsIcon, HelpCircle, LogOut, Users, Columns3, Search, Bot, TrendingUp, Sun, Menu, X, type LucideIcon } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { Wordmark } from "./Wordmark";
import { useConsultantPanel } from "./ConsultantPanel";
import type { NotificationRow } from "../lib/notifications";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

type NavItem =
  | { href: string; label: string; icon: LucideIcon; panel?: false }
  | { href: null; label: string; icon: LucideIcon; panel: true };

const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  // Not a route — opens the slide-out panel in place (see
  // components/ConsultantPanel.tsx) instead of navigating away.
  { href: null, label: "Your Consultant", icon: Bot, panel: true },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/compare", label: "Compare", icon: Columns3 },
  { href: "/search", label: "Search", icon: Search },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
  { href: "/help", label: "Help", icon: HelpCircle },
];

// userEmail comes from the server (see app/(dashboard)/layout.tsx) so
// this never has to fetch it itself — no client-side round trip, no
// flash of a missing email/sign-out button on first paint. Same for
// the notification snapshot, which also seeds the bell dropdown.
export function Sidebar({
  userId,
  userEmail,
  initialNotifications,
  initialUnreadCount,
  hasParentAccess,
}: {
  userId: string | null;
  userEmail: string | null;
  initialNotifications: NotificationRow[];
  initialUnreadCount: number;
  hasParentAccess: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: consultantOpen, openPanel } = useConsultantPanel();

  // Ties PostHog's anonymous session to the real account so events (page
  // views, AI usage, upgrades) captured before and after this point line
  // up under one person. Cheap to call repeatedly — PostHog no-ops when
  // the distinct ID hasn't changed — so no need to guard on first-render-only.
  useEffect(() => {
    if (userId) {
      posthog.identify(userId, userEmail ? { email: userEmail } : undefined);
    }
  }, [userId, userEmail]);

  // Closes the mobile drawer on navigation — without this, tapping a nav
  // link would leave the overlay open on top of the new page.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevents the page underneath from scrolling while the mobile drawer
  // is open, same as the FocusTimer/OnboardingTour overlay pattern.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const nav = (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      {NAV_ITEMS.map((item) => {
        const active = item.panel
          ? consultantOpen
          : pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.href === "/courses" && pathname.startsWith("/grades"));
        const Icon = item.icon;
        const itemStyle = {
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderRadius: "var(--radius-sm)",
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          color: active ? "white" : text,
          background: active ? blue : "transparent",
          transition: "background var(--transition-fast), color var(--transition-fast)",
        } as const;

        if (item.panel) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setMobileOpen(false);
                openPanel();
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "var(--border)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
              style={{ ...itemStyle, border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </button>
          );
        }

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
            style={itemStyle}
          >
            <Icon size={17} strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile-only top bar — hamburger + wordmark + notification bell,
          always reachable without opening the nav drawer. Hidden on
          desktop via CSS (see .xf-mobile-topbar in globals.css). */}
      <div className="xf-mobile-topbar">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="xf-tap-target"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${border}`,
            background: bg,
            color: text,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Menu size={18} strokeWidth={2} />
        </button>
        <Link href="/" aria-label="XFunction home" style={{ textDecoration: "none", display: "inline-flex" }}>
          <Wordmark size="sm" />
        </Link>
        <NotificationBell
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
        />
      </div>

      {/* Backdrop — tapping it closes the drawer, same as the class of
          overlay already used by FocusTimer/OnboardingTour. */}
      <div
        className={`xf-sidebar-backdrop${mobileOpen ? " xf-sidebar-open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <div
        className={`xf-sidebar${mobileOpen ? " xf-sidebar-open" : ""}`}
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
            aria-label="XFunction home"
            style={{ textDecoration: "none", display: "inline-flex" }}
          >
            <Wordmark size="sm" />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <NotificationBell
              initialNotifications={initialNotifications}
              initialUnreadCount={initialUnreadCount}
            />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="xf-sidebar-close xf-tap-target"
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: "transparent",
                color: textDim,
                cursor: "pointer",
              }}
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {nav}

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
    </>
  );
}
