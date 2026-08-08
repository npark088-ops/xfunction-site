"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Sparkles, Clock } from "lucide-react";

const card = "var(--card)";
const green = "var(--green)";
const amber = "var(--amber)";
const text = "var(--text)";

const DISPLAY_MS = 3200;
const FADE_MS = 300;

type ToastKind = "celebration" | "reminder";

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  leaving: boolean;
}

interface ToastContextValue {
  celebrate: (message: string) => void;
  remind: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Wraps the signed-in app (see app/(dashboard)/layout.tsx) so any page or
// component can fire a brief, self-dismissing pop-up. Two kinds, same
// motion/timing/positioning, different accent so they read differently
// at a glance:
//   - "celebration" (useEncouragement) — positive moments: completing an
//     assignment, a streak milestone, reaching a grade goal, unlocking
//     an achievement. Green, Sparkles icon.
//   - "reminder" (useReminderToast) — genuinely time-sensitive nudges
//     only: an assignment due within 24h, a planned study session not
//     yet started (see components/ToastWatcher.tsx). Amber, Clock icon.
// Neither has a close button — they're meant to be noticed in passing,
// not something a student has to act on. Callers are responsible for
// not firing "reminder" toasts too often (see ToastWatcher's dedup) —
// this component itself doesn't rate-limit, it just renders.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, kind: ToastKind) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, kind, leaving: false }]);

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, FADE_MS);
    }, DISPLAY_MS);
  }, []);

  const celebrate = useCallback((message: string) => show(message, "celebration"), [show]);
  const remind = useCallback((message: string) => show(message, "reminder"), [show]);

  return (
    <ToastContext.Provider value={{ celebrate, remind }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          const accent = t.kind === "reminder" ? amber : green;
          const Icon = t.kind === "reminder" ? Clock : Sparkles;
          return (
            <div
              key={t.id}
              className={t.leaving ? "xf-toast-out" : "xf-toast-in"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                maxWidth: 320,
                background: card,
                border: `1px solid ${accent}`,
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-md)",
                padding: "12px 16px",
                color: text,
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              <Icon size={16} strokeWidth={2} color={accent} style={{ flexShrink: 0 }} />
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// Returns a function that fires a positive "celebration" toast. Must be
// called from within ToastProvider (see app/(dashboard)/layout.tsx).
export function useEncouragement() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useEncouragement must be used within a ToastProvider");
  }
  return ctx.celebrate;
}

// Returns a function that fires an amber "reminder" toast — reserve for
// genuinely time-sensitive items (see components/ToastWatcher.tsx),
// not routine status updates.
export function useReminderToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useReminderToast must be used within a ToastProvider");
  }
  return ctx.remind;
}
