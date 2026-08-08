"use client";

import { useEffect, useState } from "react";
import {
  X,
  ArrowRight,
  Sun,
  LayoutDashboard,
  BookOpen,
  Bot,
  CalendarDays,
  TrendingUp,
  Rocket,
  type LucideIcon,
} from "lucide-react";

const bg = "var(--bg)";
const border = "var(--border)";
const blue = "var(--blue)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

const STORAGE_KEY = "xf-onboarding-tour-seen";

interface TourStep {
  icon: LucideIcon;
  title: string;
  body: string;
}

// Kept in sync with the current sidebar (see components/Sidebar.tsx) —
// update this list whenever nav items are added, renamed, or removed,
// same as this pass did for the previous (now-removed) version that
// still referenced pre-Schedule/Trends/Today navigation.
const STEPS: TourStep[] = [
  {
    icon: Sun,
    title: "Start with Today",
    body: "Your daily briefing — what's due today, today's classes, any planned study tasks, and your coach's top insight, all in one place.",
  },
  {
    icon: LayoutDashboard,
    title: "Overview is your full dashboard",
    body: "Overall grade and trend, this week's study time, AI coach check-ins, upcoming deadlines, and a combined study plan across every course.",
  },
  {
    icon: BookOpen,
    title: "Courses & Grades",
    body: "Each course tracks your real grade breakdown, and can generate AI study plans, study guides, and practice quizzes built around what's actually due.",
  },
  {
    icon: Bot,
    title: "Ask Your Consultant",
    body: "A chat advisor grounded in your real grades — ask things like \"am I going to pass this class?\" and get a specific, honest answer.",
  },
  {
    icon: CalendarDays,
    title: "Schedule your classes",
    body: "Add your class meeting times once — Canvas doesn't include them — and see them alongside logged study sessions in Week or Month view.",
  },
  {
    icon: TrendingUp,
    title: "Trends show your habits",
    body: "When you tend to study, how consistent it's been, and whether any course is getting less attention than its grade needs.",
  },
];

// A lightweight, self-contained walkthrough — not anchored to specific
// sidebar DOM positions (that needs ref-measuring/portals for real
// tooltip placement, more than a "keep it simple" pass calls for), just
// a short sequence of cards summarizing what's where. Shown once per
// browser via localStorage — not per-account, so it'll reappear if the
// student signs in on a different device, which is an acceptable
// tradeoff for how little this needs to be.
export function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // Storage disabled — just skip the tour rather than show it every load.
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Nothing to do — worst case it reappears next visit.
    }
  };

  if (!visible) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="xf-card"
        style={{
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-xl)",
          padding: 36,
          width: "100%",
          maxWidth: 420,
          boxShadow: "var(--shadow-lg)",
          position: "relative",
        }}
      >
        <button
          onClick={dismiss}
          aria-label="Skip tour"
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
          <X size={18} strokeWidth={2} />
        </button>

        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "var(--radius-md)",
            background: "rgba(37, 99, 235, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <Icon size={22} strokeWidth={2} color={blue} />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: text, margin: "0 0 8px" }}>{current.title}</h2>
        <p style={{ fontSize: 14, color: textDim, lineHeight: 1.6, margin: "0 0 28px" }}>{current.body}</p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: i === step ? blue : border,
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {!isLast && (
              <button
                onClick={dismiss}
                style={{
                  background: "none",
                  border: "none",
                  color: textDim,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "10px 4px",
                }}
              >
                Skip
              </button>
            )}
            <button
              onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                borderRadius: "var(--radius-sm)",
                background: blue,
                color: "white",
                border: "none",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {isLast ? (
                <>
                  <Rocket size={14} strokeWidth={2} />
                  Let&apos;s go
                </>
              ) : (
                <>
                  Next
                  <ArrowRight size={14} strokeWidth={2} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
