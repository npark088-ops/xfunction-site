"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Gauge, ListChecks, Repeat, Route, Target, TrendingUp } from "lucide-react";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { Wordmark } from "../components/Wordmark";
import { DroneBackground } from "../components/DroneBackground";
import { IconCards } from "../components/IconCards";
import { Reveal } from "../components/Reveal";

// Hero still image — also the poster/fallback for the optional drone
// video (see components/DroneBackground.tsx; video files go in
// public/videos/city-drone.mp4 / .webm).
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600";

// The background is lighter now, so the white hero copy gets a soft shadow
// to stay readable over bright sky and glass.
const HERO_TEXT_SHADOW = "0 1px 3px rgba(0,0,0,0.6), 0 2px 28px rgba(0,0,0,0.65)";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const text = "var(--text)";

// The three small cards under each headline (short on purpose).
const PLAN_CARDS = [
  { icon: ListChecks, title: "Know what's next", text: "A clear system tells you what to do next." },
  { icon: Gauge, title: "Waste less time", text: "Less replanning, less hesitation." },
  { icon: Target, title: "Move with confidence", text: "Go straight from plan to action." },
];

const CONSISTENCY_CARDS = [
  { icon: Route, title: "Guided every day", text: "Structured workflows guide what you do each day." },
  { icon: Repeat, title: "Fewer decisions", text: "Less uncertainty makes it easier to start." },
  { icon: TrendingUp, title: "Steady progress", text: "Consistent days add up to long-term results." },
];

export default function Home() {
  const [page, setPage] = useState("home");
  const [visible, setVisible] = useState(false);
  const [acceptedCookies, setAcceptedCookies] = useState(false);

  useEffect(() => {
  if (!localStorage.getItem("user_id")) {
    localStorage.setItem("user_id", Math.random().toString(36).substring(2));
  }
}, []);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);
  useEffect(() => {
  const hasAccepted = document.cookie.includes("acceptedCookies=true");

  if (hasAccepted) {
    setAcceptedCookies(true);
  }
}, []);
``


  return (
    <div className="xf-page-enter mk-theme" style={{ margin: 0, fontFamily: "Inter, sans-serif", background: bg }}>

      {/* NAVBAR — shared with the other public pages. The landing page keeps
          its own App link (/today) and its per-click analytics events. */}
      <MarketingNav appHref="/today" trackClicks />

      {/* ================= HOME ================= */}
      {page === "home" && (
        <div>

          {/* HERO (DRONE VIDEO + STILL IMAGE FALLBACK + DARK GRADIENT —
              all inside DroneBackground, which fills this container) */}
          <div style={{
            position: "relative",
            height: "100vh",
            overflow: "hidden"
          }}>

            <DroneBackground imageSrc={HERO_IMAGE} />

            {/* HERO TEXT — kept white: this sits on a dark video/photo
                overlay, not the page background, so light text is what
                stays readable here regardless of the site's theme. */}
<div
  style={{
    position: "relative",
    zIndex: 1,
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    color: "white",
    padding: "20px"
  }}
>
  <div
    style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0px)" : "translateY(40px)",
      transition: "all 1s ease"
    }}
  >
    <h1 style={{ margin: 0, lineHeight: 1, textShadow: HERO_TEXT_SHADOW }}>
      <Wordmark size="xl" tone="light" />
    </h1>

    <p
      style={{
        marginTop: "20px",
        fontSize: "24px",
        maxWidth: "700px",
        marginLeft: "auto",
        marginRight: "auto",
        textShadow: HERO_TEXT_SHADOW
      }}
    >
      A system designed to transform complexity into clarity,
      enabling consistent execution and long-term progress.
    </p>
  </div>
</div>

          </div>

          {/* BELOW THE HERO — three short sections: one headline, one line, and
              three small cards (or one button). Styles: the "Simplified page
              layout" block in app/marketing.css. */}
          <Reveal as="section" className="sm-section">
            <div className="mk-container">
              <div className="sm-head">
                <h2 className="sm-h2">Plan less. Execute more.</h2>
                <p className="sm-lead">Stop deciding what to do next. Follow a clear system instead.</p>
              </div>
              <IconCards items={PLAN_CARDS} />
            </div>
          </Reveal>

          <Reveal as="section" className="sm-section sm-section--flush-top">
            <div className="mk-container">
              <div className="sm-head">
                <h2 className="sm-h2">Built for consistency</h2>
                <p className="sm-lead">Motivation comes and goes. Structure stays.</p>
              </div>
              <IconCards items={CONSISTENCY_CARDS} />
            </div>
          </Reveal>

          <Reveal as="section" className="sm-section">
            <div className="mk-container">
              <div className="sm-cta">
                <h2 className="sm-h2">Reduce complexity. Build momentum.</h2>
                <p className="sm-lead">When structure replaces uncertainty, execution becomes natural.</p>
                <div className="sm-btn-row">
                  <Link href="/login" className="mk-btn mk-btn--primary mk-btn--lg">
                    Get started free
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>

        </div>
      )}

      {page === "about" && <div style={{ padding: "100px" }}>About Page</div>}
      {page === "app" && <div style={{ padding: "100px" }}>App Page</div>}
<MarketingFooter appHref="/today" />
{!acceptedCookies && (
  <div style={{
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: card,
    borderTop: `1px solid ${border}`,
    color: text,
    padding: "15px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 999
  }}>
    <span>
      This site uses cookies to improve your experience.
    </span>

    <div style={{ display: "flex", gap: "10px" }}>

      <button
  onClick={() => {
    if (typeof window !== "undefined") {
      (window as any).gtag?.('event', 'cookie_reject');
    }

    setAcceptedCookies(true);
  }}
  style={{
    padding: "8px 15px",
    background: "transparent",
    color: text,
    border: `1px solid ${border}`,
    borderRadius: "6px",
    cursor: "pointer"
  }}
>
  Reject
</button>





      <button
  onClick={() => {
  document.cookie = "acceptedCookies=true; path=/; max-age=31536000";

  if (typeof window !== "undefined") {
    (window as any).gtag?.("event", "cookie_accept");
  }

  // ✅ NEW: SEND TO YOUR BACKEND

  fetch("/api/events", {
  method: "POST",
  body: JSON.stringify({
    event: "cookie_accept",
    user: localStorage.getItem("user_id")
  })
});
``

  setAcceptedCookies(true);
}}
  style={{
    padding: "8px 15px",
    background: blue,
    color: "var(--mk-on-blue)",
    border: "none",
    borderRadius: "6px",
    fontWeight: 700,
    cursor: "pointer"
  }}
>
  Accept
</button>

    </div>
  </div>
)}
    </div>
  );
}
