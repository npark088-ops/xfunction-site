"use client";

import Link from "next/link";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
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

interface ChangelogEntry {
  date: string;
  title: string;
  items: string[];
}

// A genuine, plain-language summary of what's actually shipped, newest
// first — not raw commit messages. Dates are approximate groupings of
// real work, not a promise that a feature landed on that exact minute.
const ENTRIES: ChangelogEntry[] = [
  {
    date: "August 6, 2026",
    title: "Your Consultant, smarter search, and an honesty pass",
    items: [
      "Added Your Consultant — an AI chat advisor you can ask open-ended questions about your actual grades and coursework, grounded in your real data.",
      "Added cross-course search and a side-by-side course comparison view.",
      "Added a homework time estimator and a bulk study plan generator that covers every upcoming assignment across all your courses at once, prioritized sensibly.",
      "Added private teacher/class ratings and notes, plus a tracker for how accurate the AI's grade predictions have been for you.",
      "Labeled sample data clearly across the app, so it's always obvious when you're looking at demo data instead of your real Canvas grades.",
    ],
  },
  {
    date: "August 5, 2026",
    title: "A redesign: light theme, dark mode, and a real sidebar",
    items: [
      "Rebuilt the app around a cleaner, lighter visual style, with a genuine dark mode toggle in Settings.",
      "Restructured navigation into a proper sidebar — Overview, Courses, Grades, Tasks, Schedule, Settings.",
      "Added a focus timer, per-course notes, weekly email digests, and an achievements/badges system.",
      "Added grade goals, practice quizzes, a class schedule view, editable study plans, PDF export, in-app notifications, and a parent/guardian view.",
    ],
  },
  {
    date: "August 4, 2026",
    title: "AI study tools, Pricing, and XFunction Pro",
    items: [
      "Added AI-powered study plans, study guides, practice quizzes, and quick coach check-ins — all built around your real course and assignment data.",
      "Added a Pricing page and real subscriptions for XFunction Pro, which removes the free monthly limit on AI generations.",
      "General performance improvements across the app.",
    ],
  },
  {
    date: "July 30, 2026",
    title: "Grade tracking arrives",
    items: [
      "Added the Grades page — your current grade, a category-by-category breakdown, and how it's trending over time, for every course.",
    ],
  },
  {
    date: "July 2–3, 2026",
    title: "Tasks and an early AI coach",
    items: [
      "Added a Tasks page for tracking assignments outside of Canvas.",
      "Added AI that breaks a task down into concrete, actionable steps.",
    ],
  },
  {
    date: "June 27, 2026",
    title: "XFunction launches",
    items: [
      "First version of XFunction: connect your Canvas account and see your courses in one place.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div
      className="xf-page-enter"
      style={{ fontFamily: "Inter, sans-serif", color: text, background: bg, minHeight: "100vh" }}
    >
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
        <Link href="/" style={{ color: blue, textDecoration: "none" }}>
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
      <div
        style={{
          padding: "160px 20px 60px",
          textAlign: "center",
          background: `radial-gradient(circle at center, ${card}, transparent 70%)`,
        }}
      >
        <h1 style={{ fontSize: "48px", fontWeight: 700, color: text, margin: 0 }}>What&apos;s new</h1>
        <p style={{ marginTop: 16, fontSize: 18, color: textDim, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
          A running list of what&apos;s shipped in XFunction, in plain language — newest first.
        </p>
      </div>

      {/* TIMELINE */}
      <div style={{ padding: "20px 20px 120px", display: "flex", justifyContent: "center" }}>
        <div style={{ maxWidth: 720, width: "100%" }}>
          {ENTRIES.map((entry) => (
            <div
              key={entry.date}
              className="xf-card"
              style={{
                background: card,
                border: `1px solid ${border}`,
                borderRadius: "var(--radius-lg)",
                padding: "28px 32px",
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: blue, letterSpacing: 0.4, textTransform: "uppercase" }}>
                {entry.date}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: text, margin: "6px 0 14px" }}>{entry.title}</h2>
              <ul style={{ margin: 0, paddingLeft: 20, color: textDim, fontSize: 15, lineHeight: 1.7 }}>
                {entry.items.map((item) => (
                  <li key={item} style={{ marginBottom: 6 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
