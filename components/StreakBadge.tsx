"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveCssVar } from "../lib/theme-color";

const card = "#FFF8EB";
const textDim = "var(--text-dim)";

// Pings /api/streak once on mount to record today's visit and get back
// the current count. `increased` only comes back true the first time
// a given calendar day is recorded — not on every refresh — so the
// celebration animation fires once per day, not once per page load.
export function StreakBadge() {
  const [streak, setStreak] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    fetch("/api/streak", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setStreak(typeof data.streak === "number" ? data.streak : 0);
        if (data.increased) setCelebrate(true);
      })
      .catch(() => setStreak(0));
  }, []);

  useEffect(() => {
    if (!celebrate) return;
    const timeout = setTimeout(() => setCelebrate(false), 1600);
    return () => clearTimeout(timeout);
  }, [celebrate]);

  // Resolved to a literal hex (once per mount) specifically for the
  // spots below that append an alpha suffix, e.g. `${resolvedAmber}88`
  // — that only produces valid CSS with a real hex value, not the
  // `var(--amber)` reference `amber` holds everywhere else in this file.
  const resolvedAmber = useMemo(() => resolveCssVar("--amber", "#F5A623"), []);

  if (streak === null) return null;

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        background: `linear-gradient(135deg, ${card}, #FFF1D6)`,
        border: `1px solid ${resolvedAmber}88`,
        borderRadius: 16,
        padding: "12px 20px",
        marginBottom: 24,
        boxShadow: celebrate ? `0 0 24px ${resolvedAmber}55` : "none",
        transition: "box-shadow 0.4s ease",
      }}
    >
      <div
        style={{
          fontSize: 32,
          lineHeight: 1,
          animation: celebrate ? "streakPop 0.7s ease" : undefined,
          filter: `drop-shadow(0 0 ${celebrate ? 12 : 5}px ${resolvedAmber}aa)`,
          transition: "filter 0.4s ease",
        }}
      >
        🔥
      </div>
      <div>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 24,
            fontWeight: 700,
            color: "#8A5A00",
            lineHeight: 1.1,
          }}
        >
          {streak}
        </div>
        <div
          style={{
            fontSize: 11,
            color: textDim,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Day streak
        </div>
      </div>

      {celebrate && (
        <>
          <span style={{ position: "absolute", top: "40%", left: 18, fontSize: 14, animation: "streakParticle0 1s ease-out forwards", pointerEvents: "none" }}>
            ✨
          </span>
          <span style={{ position: "absolute", top: "40%", left: 18, fontSize: 14, animation: "streakParticle1 1s ease-out forwards", pointerEvents: "none" }}>
            ✨
          </span>
          <span style={{ position: "absolute", top: "40%", left: 18, fontSize: 14, animation: "streakParticle2 1s ease-out forwards", pointerEvents: "none" }}>
            ✨
          </span>
        </>
      )}

      <style>{`
        @keyframes streakPop {
          0% { transform: scale(1) rotate(0deg); }
          35% { transform: scale(1.35) rotate(-8deg); }
          60% { transform: scale(0.95) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes streakParticle0 {
          0% { opacity: 1; transform: translate(0, 0) scale(0.6); }
          100% { opacity: 0; transform: translate(-26px, -32px) scale(1.1); }
        }
        @keyframes streakParticle1 {
          0% { opacity: 1; transform: translate(0, 0) scale(0.6); }
          100% { opacity: 0; transform: translate(4px, -42px) scale(1.1); }
        }
        @keyframes streakParticle2 {
          0% { opacity: 1; transform: translate(0, 0) scale(0.6); }
          100% { opacity: 0; transform: translate(30px, -28px) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
