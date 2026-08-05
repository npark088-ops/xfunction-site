"use client";

import { useState } from "react";

const bg = "#0B1120";
const card = "#141B2E";
const border = "#232C45";
const cyan = "#5EEAD4";
const amber = "#F5A623";
const red = "#F16565";
const textDim = "#8B94AC";

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
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        border: `1px solid ${on && !disabled ? cyan : border}`,
        background: on && !disabled ? cyan : "transparent",
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
          background: on && !disabled ? bg : textDim,
          transition: "left 0.15s ease",
        }}
      />
    </button>
  );
}

// Everything here is seeded from the server (see
// app/(dashboard)/settings/page.tsx) — email and plan/usage are known
// on first paint, no "Loading…" state and no client-side fetch needed
// just to display them.
export function SettingsContent({
  userEmail,
  isPro,
  used,
  limit,
  justUpgraded,
}: {
  userEmail: string | null;
  isPro: boolean;
  used: number;
  limit: number;
  justUpgraded: boolean;
}) {
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  // Purely local — not wired to any backend yet, see note under
  // Notifications below. Just lets the toggle feel real to click.
  const [emailReminders, setEmailReminders] = useState(true);

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

  return (
    <>
      {justUpgraded && (
        <div
          style={{
            background: card,
            border: `1px solid ${cyan}`,
            borderRadius: 14,
            padding: "14px 18px",
            marginBottom: 24,
            color: cyan,
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
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Plan</h2>

        {isPro ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: amber, marginBottom: 4 }}>
              xFunction Pro
            </div>
            <div style={{ fontSize: 13, color: textDim }}>
              Unlimited study plans, study guides, and coach check-ins.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Free plan</div>
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
                background: amber,
                color: bg,
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
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Account</h2>

        <div style={{ fontSize: 13, color: textDim, marginBottom: 2 }}>Email</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
          {userEmail ?? "Unknown"}
        </div>

        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              background: "transparent",
              border: `1px solid ${border}`,
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </form>
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
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Notifications</h2>
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
            <div style={{ fontSize: 14, fontWeight: 600 }}>Email reminders</div>
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
