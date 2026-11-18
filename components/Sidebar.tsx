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

type NavLink = { href: string; label: string; icon: LucideIcon };

// Same destinations as before, grouped so the list scans in two short chunks
// instead of one run of eleven. Styles: the "Sidebar" block in app/app.css.
const DAILY: NavLink[] = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
];

const CLASSES: NavLink[] = [
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/compare", label: "Compare", icon: Columns3 },
  { href: "/search", label: "Search", icon: Search },
];

const ACCOUNT: NavLink[] = [
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

  const isActive = (href: string) =>
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    (href === "/courses" && pathname.startsWith("/grades"));

  const renderLink = ({ href, label, icon: Icon }: NavLink) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        className={`xf-nav__item${active ? " is-active" : ""}`}
        aria-current={active ? "page" : undefined}
      >
        <Icon size={18} strokeWidth={2} aria-hidden="true" />
        {label}
      </Link>
    );
  };

  const nav = (
    <nav className="xf-nav" aria-label="Main">
      <p className="xf-nav__label">Every day</p>
      {DAILY.map(renderLink)}

      <p className="xf-nav__label">Your classes</p>
      {CLASSES.map(renderLink)}

      {/* Not a route — opens the slide-out panel in place (see
          components/ConsultantPanel.tsx) instead of navigating away. */}
      <button
        type="button"
        className={`xf-nav__item xf-nav__item--accent${consultantOpen ? " is-active" : ""}`}
        aria-pressed={consultantOpen}
        onClick={() => {
          setMobileOpen(false);
          openPanel();
        }}
      >
        <Bot size={18} strokeWidth={2} aria-hidden="true" />
        Your Consultant
      </button>

      <div style={{ flex: 1 }} />
      {ACCOUNT.map(renderLink)}
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
            width: 40,
            height: 40,
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--text)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Menu size={20} strokeWidth={2} />
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
          width: 248,
          flexShrink: 0,
          height: "100vh",
          overflowY: "auto",
          padding: "24px 16px",
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
            margin: "0 4px 28px 8px",
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
                width: 40,
                height: 40,
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: "transparent",
                color: "var(--text-dim)",
                cursor: "pointer",
              }}
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        {nav}

        {hasParentAccess && (
          <Link
            href="/parent"
            className="xf-nav__item"
            style={{ border: "1px dashed var(--border)", marginTop: 8 }}
          >
            <Users size={18} strokeWidth={2} aria-hidden="true" />
            Parent view
          </Link>
        )}

        {userEmail && (
          <div className="xf-sidebar-user">
            <div className="xf-sidebar-user__email">{userEmail}</div>
            <form action="/auth/signout" method="POST">
              <button type="submit" className="xf-btn xf-btn--ghost xf-btn--sm" style={{ width: "100%", color: "var(--text)" }}>
                <LogOut size={16} strokeWidth={2} aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
