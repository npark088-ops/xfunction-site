"use client";

import { useState } from "react";
import posthog from "posthog-js";
import {
  PartyPopper,
  CreditCard,
  LogOut,
  Download,
  Trash2,
  Sun,
  Moon,
  Trophy,
  Mail,
  MessageSquareOff,
  Bell,
} from "lucide-react";
import { ACHIEVEMENTS } from "../lib/achievements";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const green = "var(--green)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

function Toggle({
  on,
  onClick,
  disabled = false,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={on}
      // The dark-mode toggle's initial `on` value is read from the DOM
      // (see darkMode's lazy useState initializer below), which can
      // legitimately differ from the server-rendered markup — that's
      // expected, not a real mismatch, so it shouldn't warn.
      suppressHydrationWarning
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        border: `1px solid ${on && !disabled ? blue : border}`,
        background: on && !disabled ? blue : "transparent",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on && !disabled ? 22 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: on && !disabled ? "white" : textDim,
          transition: "left 0.15s ease",
        }}
      />
    </button>
  );
}

// Everything here is seeded from the server (see
// app/(dashboard)/settings/page.tsx) — email, plan/usage, and
// achievement unlock state are all known on first paint, no
// "Loading…" state and no client-side fetch needed just to display
// them.
export function SettingsContent({
  userEmail,
  isPro,
  used,
  limit,
  chatUsed,
  chatLimit,
  justUpgraded,
  unlockedAchievementIds,
}: {
  userEmail: string | null;
  isPro: boolean;
  used: number;
  limit: number;
  chatUsed: number;
  chatLimit: number;
  justUpgraded: boolean;
  unlockedAchievementIds: string[];
}) {
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const [openingPortal, setOpeningPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Purely local — not wired to any backend yet, see note under
  // Notifications below. Just lets the toggle feel real to click.
  const [emailReminders, setEmailReminders] = useState(true);

  const [digestStatus, setDigestStatus] = useState<
    { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string } | null
  >(null);

  // Lazy initializer (not an effect) reads the DOM attribute the
  // no-flash script in app/layout.tsx already set before first paint —
  // this just syncs the toggle's own displayed state with it.
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.getAttribute("data-theme") === "dark";
  });

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private browsing / storage disabled — the toggle still works
      // for this page load, it just won't be remembered next visit.
    }
  };

  const startCheckout = () => {
    setUpgrading(true);
    setUpgradeError(null);
    posthog.capture("checkout_started", { source: "settings" });
    fetch("/api/stripe/checkout", { method: "POST" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data.url) {
          setUpgradeError(data.error || "Failed to start checkout");
          setUpgrading(false);
          return;
        }
        window.location.href = data.url;
      })
      .catch(() => {
        setUpgradeError("Failed to start checkout");
        setUpgrading(false);
      });
  };

  const openBillingPortal = () => {
    setOpeningPortal(true);
    setPortalError(null);
    fetch("/api/stripe/portal", { method: "POST" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data.url) {
          setPortalError(data.error || "Failed to open billing portal");
          setOpeningPortal(false);
          return;
        }
        window.location.href = data.url;
      })
      .catch(() => {
        setPortalError("Failed to open billing portal");
        setOpeningPortal(false);
      });
  };

  const deleteAccount = () => {
    setDeleting(true);
    setDeleteError(null);
    fetch("/api/account/delete", { method: "POST" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setDeleteError(data.error || "Failed to delete account");
          setDeleting(false);
          return;
        }
        window.location.href = "/";
      })
      .catch(() => {
        setDeleteError("Failed to delete account");
        setDeleting(false);
      });
  };

  const sendTestDigest = () => {
    setDigestStatus({ kind: "sending" });
    fetch("/api/weekly-digest", { method: "POST" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setDigestStatus({ kind: "error", message: data.error || "Failed to send digest" });
          return;
        }
        setDigestStatus({ kind: "sent" });
      })
      .catch(() => setDigestStatus({ kind: "error", message: "Failed to send digest" }));
  };

  const unlockedSet = new Set(unlockedAchievementIds);

  return (
    <>
      {justUpgraded && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#F0FDF4",
            border: `1px solid ${green}`,
            borderRadius: "var(--radius-md)",
            padding: "14px 18px",
            marginBottom: 24,
            color: "#166534",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <PartyPopper size={18} strokeWidth={2} />
          You&apos;re on XFunction Pro now — unlimited AI generations.
        </div>
      )}

      {/* Plan */}
      <div
        className="xf-card"
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-lg)",
          padding: 28,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 16,
            color: text,
          }}
        >
          <CreditCard size={17} strokeWidth={2} />
          Plan
        </h2>

        {isPro ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#8A5A00", marginBottom: 4 }}>
              XFunction Pro
            </div>
            <div style={{ fontSize: 13, color: textDim, marginBottom: 16 }}>
              Unlimited study plans, study guides, practice quizzes, coach check-ins, and messages
              to Your Consultant.
            </div>
            <button
              onClick={openBillingPortal}
              disabled={openingPortal}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: "var(--radius-sm)",
                background: "transparent",
                border: `1px solid ${border}`,
                color: text,
                fontSize: 14,
                fontWeight: 600,
                cursor: openingPortal ? "default" : "pointer",
                opacity: openingPortal ? 0.7 : 1,
              }}
            >
              <CreditCard size={14} strokeWidth={2} />
              {openingPortal ? "Opening…" : "Manage billing"}
            </button>
            <div style={{ fontSize: 12, color: textDim, marginTop: 8 }}>
              Update your card, view invoices, or cancel your subscription.
            </div>
            {portalError && (
              <div style={{ fontSize: 12, color: red, marginTop: 10 }}>{portalError}</div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: text }}>
              Free plan
            </div>
            <div style={{ fontSize: 13, color: textDim, marginBottom: 6 }}>
              {used} / {limit} AI generations used this month (study plans, study guides,
              practice quizzes, and coach check-ins combined).
            </div>
            <div style={{ fontSize: 13, color: textDim, marginBottom: 16 }}>
              {chatUsed} / {chatLimit} messages to Your Consultant used this month — a separate
              limit from the AI generations above.
            </div>
            <button
              onClick={startCheckout}
              disabled={upgrading}
              style={{
                padding: "10px 18px",
                borderRadius: "var(--radius-sm)",
                background: blue,
                color: "white",
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                cursor: upgrading ? "default" : "pointer",
                opacity: upgrading ? 0.7 : 1,
              }}
            >
              {upgrading ? "Redirecting…" : "Upgrade to Pro — $7/month"}
            </button>
            {upgradeError && (
              <div style={{ fontSize: 12, color: red, marginTop: 10 }}>{upgradeError}</div>
            )}
          </>
        )}
      </div>

      {/* Account */}
      <div
        className="xf-card"
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-lg)",
          padding: 28,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: text }}>Account</h2>

        <div style={{ fontSize: 13, color: textDim, marginBottom: 2 }}>Email</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: text }}>
          {userEmail ?? "Unknown"}
        </div>

        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: "var(--radius-sm)",
              background: bg,
              border: `1px solid ${border}`,
              color: text,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <LogOut size={14} strokeWidth={2} />
            Sign out
          </button>
        </form>
      </div>

      {/* Data & Account */}
      <div
        className="xf-card"
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-lg)",
          padding: 28,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: text }}>
          Your data
        </h2>
        <p style={{ fontSize: 12, color: textDim, marginBottom: 18 }}>
          Export everything XFunction has stored for you, or permanently delete your account.
        </p>

        <a
          href="/api/account/export"
          download
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: "var(--radius-sm)",
            background: bg,
            border: `1px solid ${border}`,
            color: text,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <Download size={14} strokeWidth={2} />
          Download my data
        </a>

        <div style={{ borderTop: `1px solid ${border}`, marginTop: 24, paddingTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: red, marginBottom: 4 }}>
            Delete my account
          </div>
          <p style={{ fontSize: 12, color: textDim, marginBottom: 14 }}>
            Permanently removes your profile, tasks, notes, Canvas connection, and everything
            else tied to your account. This can&apos;t be undone.
          </p>

          {!deleteConfirmOpen ? (
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: "var(--radius-sm)",
                background: "transparent",
                border: `1px solid ${red}`,
                color: red,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Trash2 size={14} strokeWidth={2} />
              Delete my account
            </button>
          ) : (
            <div
              style={{
                background: bg,
                border: `1px solid ${red}`,
                borderRadius: "var(--radius-md)",
                padding: 16,
              }}
            >
              <label style={{ fontSize: 13, color: text, display: "block", marginBottom: 8 }}>
                Type <strong>DELETE</strong> to confirm — this is permanent.
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${border}`,
                  background: card,
                  color: text,
                  fontSize: 14,
                  boxSizing: "border-box",
                  marginBottom: 12,
                }}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={deleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || deleting}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "var(--radius-sm)",
                    background: red,
                    border: "none",
                    color: "white",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: deleteConfirmText === "DELETE" && !deleting ? "pointer" : "default",
                    opacity: deleteConfirmText === "DELETE" && !deleting ? 1 : 0.5,
                  }}
                >
                  {deleting ? "Deleting…" : "Permanently delete"}
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setDeleteConfirmText("");
                    setDeleteError(null);
                  }}
                  disabled={deleting}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "var(--radius-sm)",
                    background: "transparent",
                    border: `1px solid ${border}`,
                    color: text,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: deleting ? "default" : "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
              {deleteError && (
                <div style={{ fontSize: 12, color: red, marginTop: 10 }}>{deleteError}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Appearance */}
      <div
        className="xf-card"
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-lg)",
          padding: 28,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: text }}>
          Appearance
        </h2>
        <p style={{ fontSize: 12, color: textDim, marginBottom: 20 }}>
          Choose how XFunction looks.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {darkMode ? <Moon size={17} strokeWidth={2} color={textDim} /> : <Sun size={17} strokeWidth={2} color={textDim} />}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: text }}>Dark mode</div>
              <div style={{ fontSize: 12, color: textDim }}>
                Switches the whole app to a dark theme. Remembered on this browser.
              </div>
            </div>
          </div>
          <Toggle on={darkMode} onClick={toggleDarkMode} />
        </div>
      </div>

      {/* Achievements */}
      <div
        className="xf-card"
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-lg)",
          padding: 28,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 4,
            color: text,
          }}
        >
          <Trophy size={17} strokeWidth={2} />
          Achievements
        </h2>
        <p style={{ fontSize: 12, color: textDim, marginBottom: 18 }}>
          Unlocked based on what you&apos;ve actually done in the app.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {ACHIEVEMENTS.map((a) => {
            const unlocked = unlockedSet.has(a.id);
            const AchievementIcon = a.icon;
            return (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 14,
                  borderRadius: "var(--radius-md)",
                  background: unlocked ? "#F0FDF4" : bg,
                  border: `1px solid ${unlocked ? green : border}`,
                  opacity: unlocked ? 1 : 0.6,
                }}
              >
                <div style={{ color: unlocked ? green : textDim, flexShrink: 0 }}>
                  <AchievementIcon size={22} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: textDim, marginTop: 2 }}>
                    {unlocked ? "Unlocked" : a.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly digest */}
      <div
        className="xf-card"
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-lg)",
          padding: 28,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 4,
            color: text,
          }}
        >
          <Mail size={17} strokeWidth={2} />
          Weekly digest
        </h2>
        <p style={{ fontSize: 12, color: textDim, marginBottom: 18 }}>
          A weekly email covering your overall grade trend, what&apos;s due in the next 7 days,
          and one coach highlight. Sends automatically once a week — use this to preview it now.
        </p>
        <button
          onClick={sendTestDigest}
          disabled={digestStatus?.kind === "sending"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: "var(--radius-sm)",
            background: "transparent",
            border: `1px solid ${blue}`,
            color: blue,
            fontSize: 14,
            fontWeight: 600,
            cursor: digestStatus?.kind === "sending" ? "default" : "pointer",
          }}
        >
          <Mail size={14} strokeWidth={2} />
          {digestStatus?.kind === "sending" ? "Sending…" : "Send me a test digest now"}
        </button>
        {digestStatus?.kind === "sent" && (
          <div style={{ fontSize: 12, color: green, marginTop: 10 }}>
            Sent — check your inbox.
          </div>
        )}
        {digestStatus?.kind === "error" && (
          <div style={{ fontSize: 12, color: red, marginTop: 10 }}>{digestStatus.message}</div>
        )}
      </div>

      {/* Notifications */}
      <div
        className="xf-card"
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-lg)",
          padding: 28,
        }}
      >
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 4,
            color: text,
          }}
        >
          <Bell size={17} strokeWidth={2} />
          Notifications
        </h2>
        <p style={{ color: textDim, fontSize: 13, marginBottom: 20 }}>
          Choose how you&apos;d like to be reminded about urgent deadlines.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 0",
            borderBottom: `1px solid ${border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Mail size={16} strokeWidth={2} color={textDim} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: text }}>Email reminders</div>
              <div style={{ fontSize: 12, color: textDim }}>
                Deadline reminders sent to {userEmail ?? "your email"}
              </div>
            </div>
          </div>
          <Toggle on={emailReminders} onClick={() => setEmailReminders((v) => !v)} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MessageSquareOff size={16} strokeWidth={2} color={textDim} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: textDim }}>
                Text reminders <span style={{ fontWeight: 400 }}>(coming soon)</span>
              </div>
              <div style={{ fontSize: 12, color: textDim }}>Deadline reminders sent by SMS</div>
            </div>
          </div>
          <Toggle on={false} onClick={() => {}} disabled />
        </div>

        <div
          style={{
            marginTop: 20,
            padding: "12px 14px",
            borderRadius: "var(--radius-sm)",
            background: bg,
            border: `1px solid ${border}`,
            fontSize: 12,
            color: textDim,
            lineHeight: 1.5,
          }}
        >
          These toggles aren&apos;t wired up yet — email reminders can currently be sent
          on-demand from the &ldquo;Coming up&rdquo; section of the Overview page.
        </div>
      </div>
    </>
  );
}
