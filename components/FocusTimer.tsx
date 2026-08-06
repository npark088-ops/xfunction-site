"use client";

import { useEffect, useState } from "react";
import { X, Minus, Plus, Play, Pause, RotateCcw, SkipForward } from "lucide-react";

const bg = "var(--bg)";
const border = "var(--border)";
const blue = "var(--blue)";
const green = "var(--green)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

const MIN_FOCUS = 5;
const MAX_FOCUS = 90;
const MIN_BREAK = 1;
const MAX_BREAK = 30;

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const primaryButton = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 22px",
  borderRadius: "var(--radius-sm)",
  background: blue,
  color: "white",
  border: "none",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 18px",
  borderRadius: "var(--radius-sm)",
  background: "transparent",
  color: text,
  border: `1px solid ${border}`,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const stepperButton = {
  width: 26,
  height: 26,
  borderRadius: "var(--radius-sm)",
  border: `1px solid ${border}`,
  background: "white",
  color: text,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  lineHeight: 1,
};

// Simple Pomodoro-style focus timer, shown as a full overlay (not a
// tucked-away corner widget) so it actually gets used. Launched from a
// study plan step on the Grades page — see app/(dashboard)/grades/[courseId]/page.tsx.
export function FocusTimer({
  taskLabel,
  onClose,
}: {
  taskLabel: string | null;
  onClose: () => void;
}) {
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  const phaseMinutes = phase === "focus" ? focusMinutes : breakMinutes;
  const done = secondsLeft <= 0;

  // Stopping at zero happens inside the interval callback (an async
  // timer tick, not the effect's own synchronous execution) rather
  // than a separate effect that watches `done` — that second effect
  // would be calling setState directly during an effect body, which
  // trips react-hooks/set-state-in-effect and cascades an extra render.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // Esc closes the overlay, same as clicking the backdrop/X.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const switchPhase = () => {
    const next = phase === "focus" ? "break" : "focus";
    setPhase(next);
    setSecondsLeft((next === "focus" ? focusMinutes : breakMinutes) * 60);
  };

  const start = () => setRunning(true);
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setSecondsLeft(phaseMinutes * 60);
  };

  const adjustFocus = (delta: number) => {
    const next = Math.max(MIN_FOCUS, Math.min(MAX_FOCUS, focusMinutes + delta));
    setFocusMinutes(next);
    if (phase === "focus" && !running) setSecondsLeft(next * 60);
  };

  const adjustBreak = (delta: number) => {
    const next = Math.max(MIN_BREAK, Math.min(MAX_BREAK, breakMinutes + delta));
    setBreakMinutes(next);
    if (phase === "break" && !running) setSecondsLeft(next * 60);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: bg,
          borderRadius: "var(--radius-xl)",
          padding: 40,
          width: "100%",
          maxWidth: 420,
          boxShadow: "var(--shadow-lg)",
          textAlign: "center",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close focus timer"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            display: "flex",
            cursor: "pointer",
            color: textDim,
          }}
        >
          <X size={20} strokeWidth={2} />
        </button>

        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: phase === "focus" ? blue : green,
            marginBottom: 8,
          }}
        >
          {phase === "focus" ? "Focus session" : "Break"}
        </div>

        {taskLabel && phase === "focus" && (
          <div style={{ fontSize: 14, color: textDim, marginBottom: 20, lineHeight: 1.5 }}>
            {taskLabel}
          </div>
        )}

        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 64,
            fontWeight: 700,
            color: text,
            marginBottom: 24,
          }}
        >
          {formatTime(secondsLeft)}
        </div>

        {done ? (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: text, marginBottom: 16 }}>
              {phase === "focus" ? "Nice work — take a break." : "Break's over — ready to focus?"}
            </div>
            <button onClick={switchPhase} style={primaryButton}>
              <Play size={14} strokeWidth={2} fill="white" />
              {phase === "focus" ? "Start break" : "Start next focus session"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 28 }}>
            {!running ? (
              <button onClick={start} style={primaryButton}>
                <Play size={14} strokeWidth={2} fill="white" />
                Start
              </button>
            ) : (
              <button onClick={pause} style={secondaryButton}>
                <Pause size={13} strokeWidth={2} />
                Pause
              </button>
            )}
            <button onClick={reset} style={secondaryButton}>
              <RotateCcw size={13} strokeWidth={2} />
              Reset
            </button>
            <button onClick={switchPhase} style={secondaryButton}>
              <SkipForward size={13} strokeWidth={2} />
              Skip to {phase === "focus" ? "break" : "focus"}
            </button>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 32,
            borderTop: `1px solid ${border}`,
            paddingTop: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: textDim, marginBottom: 6 }}>Focus (min)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => adjustFocus(-5)} disabled={running} style={stepperButton}>
                <Minus size={13} strokeWidth={2.5} />
              </button>
              <div style={{ fontWeight: 700, color: text, width: 24 }}>{focusMinutes}</div>
              <button onClick={() => adjustFocus(5)} disabled={running} style={stepperButton}>
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: textDim, marginBottom: 6 }}>Break (min)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => adjustBreak(-1)} disabled={running} style={stepperButton}>
                <Minus size={13} strokeWidth={2.5} />
              </button>
              <div style={{ fontWeight: 700, color: text, width: 24 }}>{breakMinutes}</div>
              <button onClick={() => adjustBreak(1)} disabled={running} style={stepperButton}>
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
