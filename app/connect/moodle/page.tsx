"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, AlertTriangle } from "lucide-react";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "var(--radius-sm)",
  border: `1px solid ${border}`,
  background: bg,
  color: text,
  fontSize: 14,
  boxSizing: "border-box" as const,
};

// Not under app/(dashboard) — Moodle's real integration has no
// redirect-to-provider step to send the browser to (see
// lib/moodle-auth.ts), so unlike Canvas/Google Classroom/Schoology/
// Blackboard's "Connect X" links (which hit an /api/{platform}/connect
// route that immediately redirects offsite), this one has to be an
// actual page of OUR OWN that collects the student's Moodle site URL +
// login directly, the same way any real Moodle-integrating app would.
// Standalone (no sidebar), same pattern as app/parent/join/page.tsx.
export default function ConnectMoodlePage() {
  const [siteUrl, setSiteUrl] = useState("http://localhost:3000");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/moodle/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteUrl, username, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.message || "Failed to connect to Moodle.");
      return;
    }

    window.location.href = "/courses?moodle=connected";
  };

  return (
    <div
      className="xf-page-enter"
      style={{
        minHeight: "100vh",
        background: bg,
        color: text,
        fontFamily: "Inter, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <Link
          href="/courses"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: blue,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={15} strokeWidth={2.5} />
          Back to Courses
        </Link>

        <div
          className="xf-card"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
            padding: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
              color: textDim,
              fontSize: 13,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <KeyRound size={14} strokeWidth={2} />
            Local mock Moodle stand-in
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: text }}>
            Connect Moodle
          </h1>
          <p style={{ color: textDim, fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
            Moodle logs you in directly — no separate consent screen — so this is your Moodle
            site&apos;s own sign-in, not ours. Enter your school&apos;s Moodle URL and your
            regular Moodle login.
          </p>

          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 13, color: textDim, display: "block", marginBottom: 6 }}>
              Moodle site URL
            </label>
            <input
              type="url"
              required
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://yourschool.moodlecloud.com"
              style={{ ...inputStyle, marginBottom: 16 }}
            />

            <label style={{ fontSize: 13, color: textDim, display: "block", marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ ...inputStyle, marginBottom: 16 }}
            />

            <label style={{ fontSize: 13, color: textDim, display: "block", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, marginBottom: 20 }}
            />

            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: red,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                <AlertTriangle size={13} strokeWidth={2} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                background: blue,
                color: "white",
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Connecting…" : "Connect"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
