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

const FAQS = [
  {
    q: "What is XFunction?",
    a: "XFunction is a grade-tracking and study-planning app for students. It pulls your courses and assignments in from Canvas, shows your current grade and how it's trending, and uses AI to generate study plans, study guides, practice quizzes, and quick coach check-ins so you always know what to work on next.",
  },
  {
    q: "How does Canvas connect work?",
    a: "Go to the Courses page and click \"Connect Canvas.\" Right now this app runs on a local mock Canvas stand-in for demo purposes — no real Canvas login or credentials are needed. Once connected, your courses and assignments show up across Overview, Courses, and each course's Grades page.",
  },
  {
    q: "What's free vs. Pro?",
    a: "Free includes unlimited grade tracking across all your courses, grade trend charts, email & text deadline reminders, daily streak tracking, and 3 AI generations a month (study plans, study guides, practice quizzes, and coach check-ins combined). Pro is $7/month and removes the AI generation limit entirely — unlimited study plans, study guides, practice quizzes, and coach check-ins.",
  },
  {
    q: "How do AI generations work?",
    a: "Study plans, study guides, practice quizzes, and coach check-ins all draw from the same monthly pool — 3 free generations total, not 3 of each. The count resets automatically at the start of each calendar month, and you can see your current usage on the Settings page. Pro accounts skip the limit entirely.",
  },
  {
    q: "How do I cancel Pro?",
    a: "Go to Settings → Plan and click \"Manage billing.\" That opens Stripe's billing portal, where you can update your card, view past invoices, or cancel your subscription — no need to email anyone.",
  },
];

export default function HelpPage() {
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
          Help & FAQ
        </h1>
        <p style={{ color: textDim, fontSize: 17, maxWidth: 500, margin: "0 auto" }}>
          Common questions about how XFunction works.
        </p>
      </div>

      {/* FAQ LIST */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 140px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {FAQS.map((item) => (
            <div
              key={item.q}
              className="xf-card"
              style={{
                background: card,
                border: `1px solid ${border}`,
                borderRadius: "var(--radius-lg)",
                padding: 28,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 10, color: text }}>
                {item.q}
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: textDim, margin: 0 }}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
