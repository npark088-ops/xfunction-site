"use client";

import { useState } from "react";

const card = "#FFF8EB";
const amber = "var(--amber)";
const blue = "var(--blue)";
const red = "var(--red)";
const text = "var(--text)";

// Shown wherever an AI generation request comes back 402 upgrade_required
// (see lib/ai-usage.ts). "Upgrade to Pro" kicks off a real Stripe
// Checkout session and redirects there.
export function UpgradePrompt({ message }: { message?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = () => {
    setLoading(true);
    setError(null);
    fetch("/api/stripe/checkout", { method: "POST" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data.url) {
          setError(data.error || "Failed to start checkout");
          setLoading(false);
          return;
        }
        window.location.href = data.url;
      })
      .catch(() => {
        setError("Failed to start checkout");
        setLoading(false);
      });
  };

  return (
    <div
      style={{
        background: card,
        border: `1px solid ${amber}`,
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: "#8A5A00", marginBottom: 4 }}>
        Free plan limit reached
      </div>
      <p style={{ fontSize: 13, color: text, margin: 0, marginBottom: 14, lineHeight: 1.5 }}>
        {message ?? "You've used all your free AI generations this month."} Upgrade to xFunction
        Pro for unlimited study plans, study guides, and coach check-ins — $7/month.
      </p>
      <button
        onClick={startCheckout}
        disabled={loading}
        style={{
          padding: "8px 16px",
          borderRadius: 10,
          background: blue,
          color: "white",
          border: "none",
          fontSize: 13,
          fontWeight: 700,
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Redirecting…" : "Upgrade to Pro"}
      </button>
      {error && <div style={{ fontSize: 12, color: red, marginTop: 10 }}>{error}</div>}
    </div>
  );
}
