"use client";

import { useState } from "react";
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
  justUpgraded,
  unlockedAchievementIds,
}: {
  userEmail: string | null;
  isPro: boolean;
  used: number;
  limit: number;
  justUpgraded: boolean;
  unlockedAchievementIds: string[];
}) {
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

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
            background: "#F0FDF4",
            border: `1px solid ${green}`,
            borderRadius: 14,
            padding: "14px 18px",
            marginBottom: 24,
            color: "#166534",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          🎉 You&apos;re on xFunction Pro now — unlimited AI generations.
        </div>
      )}

      {/* Plan */}
      <div
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: 16,
          padding: 28,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: text }}>Plan</h2>

        {isPro ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#8A5A00", marginBottom: 4 }}>
              xFunction Pro
            </div>
            <div style={{ fontSize: 13, color: textDim }}>
              Unlimited study plans, study guides, and coach check-ins.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: text }}>
              Free plan
            </div>
            <div style={{ fontSize: 13, color: textDim, marginBottom: 16 }}>
              {used} / {limit} AI generations used this month (study plans, study guides, and
              coach check-ins combined).
            </div>
            <button
              onClick={startCheckout}
              disabled={upgrading}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
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
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: 16,
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
              padding: "10px 18px",
              borderRadius: 10,
              background: bg,
              border: `1px solid ${border}`,
              color: text,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </form>
      </div>

      {/* Appearance */}
      <div
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: 16,
          padding: 28,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: text }}>
          Appearance
        </h2>
        <p style={{ fontSize: 12, color: textDim, marginBottom: 20 }}>
          Choose how xFunction looks.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: text }}>Dark mode</div>
            <div style={{ fontSize: 12, color: textDim }}>
              Switches the whole app to a dark theme. Remembered on this browser.
            </div>
          </div>
          <Toggle on={darkMode} onClick={toggleDarkMode} />
        </div>
      </div>

      {/* Achievements */}
      <div
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: 16,
          padding: 28,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: text }}>
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
            return (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  background: unlocked ? "#F0FDF4" : bg,
                  border: `1px solid ${unlocked ? green : border}`,
                  opacity: unlocked ? 1 : 0.6,
                }}
              >
                <div style={{ fontSize: 22, lineHeight: 1 }}>{a.icon}</div>
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
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: 16,
          padding: 28,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: text }}>
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
            padding: "10px 18px",
            borderRadius: 10,
            background: "transparent",
            border: `1px solid ${blue}`,
            color: blue,
            fontSize: 14,
            fontWeight: 600,
            cursor: digestStatus?.kind === "sending" ? "default" : "pointer",
          }}
        >
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
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: 16,
          padding: 28,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: text }}>
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
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: text }}>Email reminders</div>
            <div style={{ fontSize: 12, color: textDim }}>
              Deadline reminders sent to {userEmail ?? "your email"}
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
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: textDim }}>
              Text reminders <span style={{ fontWeight: 400 }}>(coming soon)</span>
            </div>
            <div style={{ fontSize: 12, color: textDim }}>Deadline reminders sent by SMS</div>
          </div>
          <Toggle on={false} onClick={() => {}} disabled />
        </div>

        <div
          style={{
            marginTop: 20,
            padding: "12px 14px",
            borderRadius: 10,
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
