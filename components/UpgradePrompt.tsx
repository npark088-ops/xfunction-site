"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import posthog from "posthog-js";

const card = "#FFF8EB";
const amber = "var(--amber)";
const blue = "var(--blue)";
const red = "var(--red)";
const text = "var(--text)";

// Shown wherever an AI generation request comes back 402 upgrade_required
// (see lib/ai-usage.ts). "Upgrade to Pro" kicks off a real Stripe
// Checkout session and redirects there. `context` picks which of the two
// separate free-tier quotas (see lib/ai-usage.ts) the explanatory copy
// below refers to, so it's never ambiguous which limit was actually hit —
// "chat" for Your Consultant, "generations" for everything else.
export function UpgradePrompt({
  message,
  context = "generations",
}: {
  message?: string;
  context?: "chat" | "generations";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = () => {
    setLoading(true);
    setError(null);
    posthog.capture("checkout_started", { source: `upgrade_prompt_${context}` });
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
      className="xf-card"
      style={{
        background: card,
        border: `1px solid ${amber}`,
        borderRadius: "var(--radius-md)",
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          fontWeight: 700,
          color: "#8A5A00",
          marginBottom: 4,
        }}
      >
        <Zap size={16} strokeWidth={2} fill="#8A5A00" fillOpacity={0.2} />
        Free plan limit reached
      </div>
      <p style={{ fontSize: 13, color: text, margin: 0, marginBottom: 14, lineHeight: 1.5 }}>
        {message ?? "You've used all your free AI generations this month."}{" "}
        {context === "chat"
          ? "Upgrade to XFunction Pro for unlimited messages to Your Consultant — $7/month."
          : "Upgrade to XFunction Pro for unlimited study plans, study guides, practice quizzes, and coach check-ins — $7/month."}
      </p>
      <button
        onClick={startCheckout}
        disabled={loading}
        style={{
          padding: "8px 16px",
          borderRadius: "var(--radius-sm)",
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
