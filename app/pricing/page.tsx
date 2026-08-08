"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import posthog from "posthog-js";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const green = "var(--green)";
const amber = "var(--amber)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

const navLink = {
  textDecoration: "none",
  color: text,
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
  paddingBottom: 4,
  borderBottom: "2px solid transparent",
  transition: "color var(--transition-fast), border-color var(--transition-fast)",
};

function navLinkHoverOn(e: React.MouseEvent<HTMLAnchorElement>) {
  e.currentTarget.style.color = blue;
  e.currentTarget.style.borderBottomColor = blue;
}

function navLinkHoverOff(e: React.MouseEvent<HTMLAnchorElement>) {
  e.currentTarget.style.color = text;
  e.currentTarget.style.borderBottomColor = "transparent";
}

const FREE_FEATURES = [
  "Unlimited grade tracking across all your courses",
  "Grade trend charts",
  "Email & text deadline reminders",
  "Daily streak tracking",
  "3 AI generations / month (study plans, study guides, practice quizzes, coach check-ins combined)",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited study plans",
  "Unlimited study guides",
  "Unlimited practice quizzes",
  "Unlimited AI coach check-ins",
];

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = () => {
    setLoading(true);
    setError(null);
    posthog.capture("checkout_started", { source: "pricing_page" });
    fetch("/api/stripe/checkout", { method: "POST" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, status: res.status, data })))
      .then(({ ok, status, data }) => {
        if (status === 401) {
          window.location.href = "/login?next=/pricing";
          return;
        }
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
    <div className="xf-page-enter" style={{ fontFamily: "Inter, sans-serif", color: text, background: bg, minHeight: "100vh" }}>
      {/* NAVBAR */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 40px",
          background: bg,
          borderBottom: `1px solid ${border}`,
          color: text,
          zIndex: 100,
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <h2 style={{ color: blue, margin: 0 }}>XFunction</h2>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <Link href="/" style={navLink} onMouseEnter={navLinkHoverOn} onMouseLeave={navLinkHoverOff}>
            Home
          </Link>
          <Link href="/about" style={navLink} onMouseEnter={navLinkHoverOn} onMouseLeave={navLinkHoverOff}>
            About
          </Link>
          <Link href="/pricing" style={navLink} onMouseEnter={navLinkHoverOn} onMouseLeave={navLinkHoverOff}>
            Pricing
          </Link>
          <Link href="/help" style={navLink} onMouseEnter={navLinkHoverOn} onMouseLeave={navLinkHoverOff}>
            Help
          </Link>
          <Link href="/changelog" style={navLink} onMouseEnter={navLinkHoverOn} onMouseLeave={navLinkHoverOff}>
            What&apos;s New
          </Link>
          <Link href="/overview" style={navLink} onMouseEnter={navLinkHoverOn} onMouseLeave={navLinkHoverOff}>
            App
          </Link>
        </div>
      </div>

      {/* HERO */}
      <div style={{ padding: "160px 20px 60px", textAlign: "center" }}>
        <h1 style={{ fontSize: 44, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.02em", color: text }}>
          Simple pricing
        </h1>
        <p style={{ color: textDim, fontSize: 17, maxWidth: 500, margin: "0 auto" }}>
          Start free. Upgrade whenever you want unlimited AI help.
        </p>
      </div>

      {/* PLANS */}
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "0 20px 120px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 28,
        }}
      >
        {/* FREE */}
        <div
          className="xf-card xf-card-hover"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-xl)",
            padding: 36,
          }}
        >
          <div style={{ fontSize: 14, color: textDim, fontWeight: 600, marginBottom: 8 }}>
            Free
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 4, color: text }}>
            $0
            <span style={{ fontSize: 16, fontWeight: 500, color: textDim }}> /month</span>
          </div>
          <p style={{ color: textDim, fontSize: 14, marginBottom: 28 }}>
            Everything you need to stay on top of your grades.
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: 32 }}>
            {FREE_FEATURES.map((f) => (
              <li
                key={f}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  fontSize: 14,
                  lineHeight: 1.6,
                  marginBottom: 12,
                  color: text,
                }}
              >
                <span style={{ color: green, flexShrink: 0 }}><Check size={15} strokeWidth={2.5} /></span>
                {f}
              </li>
            ))}
          </ul>

          <Link
            href="/login"
            style={{
              display: "block",
              textAlign: "center",
              padding: "12px 20px",
              borderRadius: "var(--radius-sm)",
              background: "transparent",
              border: `1px solid ${border}`,
              color: text,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Get started free
          </Link>
        </div>

        {/* PRO */}
        <div
          className="xf-card xf-card-hover"
          style={{
            background: card,
            border: `1px solid ${amber}`,
            borderRadius: "var(--radius-xl)",
            padding: 36,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -14,
              right: 28,
              background: amber,
              color: "#0B1120",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 12px",
              borderRadius: 999,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Unlimited AI
          </div>

          <div style={{ fontSize: 14, color: "#8A5A00", fontWeight: 600, marginBottom: 8 }}>
            XFunction Pro
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 4, color: text }}>
            $7
            <span style={{ fontSize: 16, fontWeight: 500, color: textDim }}> /month</span>
          </div>
          <p style={{ color: textDim, fontSize: 14, marginBottom: 28 }}>
            For when 3 AI generations a month isn&apos;t enough.
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: 32 }}>
            {PRO_FEATURES.map((f) => (
              <li
                key={f}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  fontSize: 14,
                  lineHeight: 1.6,
                  marginBottom: 12,
                  color: text,
                }}
              >
                <span style={{ color: green, flexShrink: 0 }}><Check size={15} strokeWidth={2.5} /></span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={startCheckout}
            disabled={loading}
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              padding: "12px 20px",
              borderRadius: "var(--radius-sm)",
              background: blue,
              border: "none",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Redirecting…" : "Upgrade to Pro"}
          </button>
          {error && (
            <div style={{ fontSize: 12, color: red, marginTop: 10, textAlign: "center" }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
