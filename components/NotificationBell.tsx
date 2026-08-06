"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Trophy, Clock, AlertTriangle, type LucideIcon } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import type { NotificationRow } from "../lib/notifications";

const card = "var(--card)";
const border = "var(--border)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

const TYPE_ICON: Record<string, LucideIcon> = {
  achievement: Trophy,
  deadline: Clock,
  "ai-limit": AlertTriangle,
};

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Seeded from the server (see app/(dashboard)/layout.tsx, which also
// syncs which notifications should exist before this ever renders) —
// no fetch-on-mount, no loading flash. Opening the dropdown marks
// everything read optimistically, with a rollback if the request fails.
export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: NotificationRow[];
  initialUnreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  const openDropdown = () => {
    setOpen(true);
    if (unreadCount === 0) return;

    const previousNotifications = notifications;
    const previousCount = unreadCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    const supabase = createClient();
    supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false)
      .then(({ error }) => {
        if (error) {
          console.error(error);
          setNotifications(previousNotifications);
          setUnreadCount(previousCount);
        }
      });
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        aria-label="Notifications"
        style={{
          position: "relative",
          width: 36,
          height: 36,
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${border}`,
          background: "transparent",
          color: text,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Bell size={17} strokeWidth={2} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 999,
              background: red,
              color: "white",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200 }} />
          <div
            style={{
              position: "absolute",
              top: 44,
              left: 0,
              width: 300,
              maxHeight: 360,
              overflowY: "auto",
              background: card,
              border: `1px solid ${border}`,
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lg)",
              zIndex: 201,
              padding: 8,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: textDim,
                padding: "8px 10px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Notifications
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: "16px 10px", fontSize: 13, color: textDim }}>Nothing yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {notifications.map((n) => {
                  const TypeIcon = TYPE_ICON[n.type] ?? Bell;
                  const row = (
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: "10px 10px",
                        borderRadius: "var(--radius-sm)",
                        background: n.read ? "transparent" : "rgba(37, 99, 235, 0.08)",
                      }}
                    >
                      <div style={{ color: textDim, flexShrink: 0, paddingTop: 1 }}>
                        <TypeIcon size={16} strokeWidth={2} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: text, lineHeight: 1.4 }}>{n.message}</div>
                        <div style={{ fontSize: 11, color: textDim, marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  );
                  return n.link ? (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => setOpen(false)}
                      style={{ textDecoration: "none" }}
                    >
                      {row}
                    </Link>
                  ) : (
                    <div key={n.id}>{row}</div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
