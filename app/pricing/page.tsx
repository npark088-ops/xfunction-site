"use client";

import Link from "next/link";
import { useState } from "react";

const bg = "#0B1120";
const card = "#141B2E";
const border = "#232C45";
const cyan = "#5EEAD4";
const amber = "#F5A623";
const red = "#F16565";
const textDim = "#8B94AC";

const navLink = {
  textDecoration: "none",
  color: "white",
  fontSize: "16px",
  cursor: "pointer",
  transition: "opacity 0.3s",
};

const FREE_FEATURES = [
  "Unlimited grade tracking across all your courses",
  "Grade trend charts",
  "Email & text deadline reminders",
  "Daily streak tracking",
  "3 AI generations / month (study plans, study guides, coach check-ins combined)",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited study plans",
  "Unlimited study guides",
  "Unlimited AI coach check-ins",
];

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = () => {
    setLoading(true);
    setError(null);
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
    <div style={{ fontFamily: "Inter, sans-serif", color: "white", background: bg, minHeight: "100vh" }}>
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
          color: "white",
          zIndex: 100,
        }}
      >
        <h2 style={{ color: cyan }}>XFunction</h2>

        <div style={{ display: "flex", gap: "30px" }}>
          <Link
            href="/"
            style={navLink}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Home
          </Link>
          <Link
            href="/about"
            style={navLink}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            About
          </Link>
          <Link
            href="/pricing"
            style={navLink}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Pricing
          </Link>
          <Link
            href="/overview"
            style={navLink}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            App
          </Link>
        </div>
      </div>

      {/* HERO */}
      <div style={{ padding: "160px 20px 60px", textAlign: "center" }}>
        <h1 style={{ fontSize: 44, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.02em" }}>
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
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 20,
            padding: 36,
          }}
        >
          <div style={{ fontSize: 14, color: textDim, fontWeight: 600, marginBottom: 8 }}>
            Free
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 4 }}>
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
                  color: "white",
                }}
              >
                <span style={{ color: cyan, flexShrink: 0 }}>✓</span>
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
              borderRadius: 10,
              background: "transparent",
              border: `1px solid ${border}`,
              color: "white",
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
          style={{
            background: card,
            border: `1px solid ${amber}`,
            borderRadius: 20,
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
              color: bg,
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

          <div style={{ fontSize: 14, color: amber, fontWeight: 600, marginBottom: 8 }}>
            xFunction Pro
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 4 }}>
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
                  color: "white",
                }}
              >
                <span style={{ color: amber, flexShrink: 0 }}>✓</span>
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
              borderRadius: 10,
              background: amber,
              border: "none",
              color: bg,
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
