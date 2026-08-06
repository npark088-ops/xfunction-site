"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

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
    <div style={{ margin: 0, fontFamily: "Inter, sans-serif", background: bg }}>

      {/* NAVBAR — solid background (not transparent) so it stays
          readable over both the dark hero video and the light sections
          below it while scrolling. */}
      <div style={{
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  boxSizing: "border-box",
  display: "flex",
  justifyContent: "space-between",
  padding: "24px",
  background: bg,
  borderBottom: `1px solid ${border}`,
  color: text,
  zIndex: 100
}}>
  <h2 style={{ color: blue }}>XFunction</h2>

<div style={{ display: "flex", gap: "32px" }}>

  <span
    onClick={() => {
      if (typeof window !== "undefined") {
        (window as any).gtag?.("event", "click_home");
      }
    }}
  >
    <Link href="/" style={navBtn}>
      Home
    </Link>
  </span>

  <span
    onClick={() => {
      if (typeof window !== "undefined") {
        (window as any).gtag?.("event", "click_about");
      }
    }}
  >
    <Link href="/about" style={navBtn}>
      About
    </Link>
  </span>

  <span
    onClick={() => {
      if (typeof window !== "undefined") {
        (window as any).gtag?.("event", "click_pricing");
      }
    }}
  >
    <Link href="/pricing" style={navBtn}>
      Pricing
    </Link>
  </span>

  <span
    onClick={() => {
      if (typeof window !== "undefined") {
        (window as any).gtag?.("event", "click_app");
      }
    }}
  >
    <Link href="/overview" style={navBtn}>
      App
    </Link>
  </span>

</div>
</div>

      {/* ================= HOME ================= */}
      {page === "home" && (
        <div>

          {/* HERO (VIDEO + IMAGE FALLBACK) */}
          <div style={{
            position: "relative",
            height: "100vh",
            overflow: "hidden",
            backgroundImage:
              "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600')",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}>

            {/* VIDEO */}
            <video
              autoPlay
              muted
              loop
              playsInline
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover"
              }}
            >
              <source
                src="https://cdn.coverr.co/videos/coverr-night-drive-through-city-traffic-1605/1080p.mp4"
                type="video/mp4"
              />
            </video>

            {/* OVERLAY */}
            <div style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.5)"
            }} />

            {/* HERO TEXT — kept white: this sits on a dark video/photo
                overlay, not the page background, so light text is what
                stays readable here regardless of the site's theme. */}
<div
  style={{
    position: "relative",
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
    <h1
      style={{
        fontSize: "100px",
        fontWeight: "600",
        lineHeight: "1.1"
      }}
    >
      XFunction
    </h1>

    <p
      style={{
        marginTop: "20px",
        fontSize: "24px",
        maxWidth: "700px",
        marginLeft: "auto",
        marginRight: "auto"
      }}
    >
      A system designed to transform complexity into clarity,
      enabling consistent execution and long-term progress.
    </p>
  </div>
</div>

          </div>

          {/* SECTION 1 */}
          <div style={{
  padding: "120px 20px",
  background: bg,
  display: "flex",
  justifyContent: "center"
}}>
  <div style={{
    maxWidth: "900px",
    textAlign: "center",
    padding: "60px",
    borderRadius: "20px",
    background: card,
    border: `1px solid ${border}`
  }}>

    <h2 style={{
      fontSize: "52px",
      fontWeight: "700",
      color: text
    }}>
      Plan less. Execute more.
    </h2>

    <p style={{
      marginTop: "20px",
      fontSize: "20px",
      color: textDim,
      lineHeight: "1.7"
    }}>
      XFunction eliminates the constant need to decide what to do next.
      Instead of repeatedly planning and reorganizing your work, you follow
      a structured system that directs your actions automatically.
    </p>

    <p style={{
      marginTop: "15px",
      fontSize: "20px",
      color: textDim,
      lineHeight: "1.7"
    }}>
      This removes hesitation, reduces wasted time, and allows you to
      move directly into execution with clarity and confidence.
    </p>

  </div>
</div>
          {/* IMAGE */}
          <div style={{
            height: "75vh",
            backgroundImage:
  "url('https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1600')",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }} />

          {/* SECTION 2 */}
          <div style={{
  padding: "120px 20px",
  background: bg,
  display: "flex",
  justifyContent: "center"
}}>
  <div style={{
    maxWidth: "900px",
    textAlign: "center",
    padding: "60px",
    borderRadius: "20px",
    background: card,
    border: `1px solid ${border}`
  }}>
    <h2 style={{
  fontSize: "52px",
  fontWeight: "700",
  color: text
}}>
      Built for consistency
    </h2>

    <p style={{
      marginTop: "20px",
      fontSize: "20px",
      color: textDim,
      lineHeight: "1.7"
    }}>
      Most systems depend on motivation, which fluctuates over time.
      XFunction replaces that unpredictability with structured workflows
      that guide your actions every day.
    </p>

    <p style={{
      marginTop: "15px",
      fontSize: "20px",
      color: textDim,
      lineHeight: "1.7"
    }}>
      By removing uncertainty and simplifying decisions, execution becomes
      consistent—and long-term progress becomes inevitable.
    </p>
  </div>
</div>

          {/* IMAGE 2 */}
          <div style={{
  height: "80vh",
  backgroundImage:
    "url('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1600')",
  backgroundSize: "cover",
  backgroundPosition: "center"
}} />


          {/* FINAL SECTION */}
          <div style={{
            padding: "140px 20px",
            textAlign: "center",
            background: card,
            borderTop: `1px solid ${border}`,
            color: text
          }}>
            <h2 style={{ fontSize: "44px" }}>
              Reduce complexity. Build momentum.
            </h2>

            <p style={{
              marginTop: "20px",
              fontSize: "18px",
              maxWidth: "700px",
              marginLeft: "auto",
              marginRight: "auto",
              color: textDim
            }}>
              When structure replaces uncertainty, execution becomes natural.
              Over time, this creates a compounding effect of consistent progress
              and measurable results.
            </p>
          </div>

        </div>
      )}

      {page === "about" && <div style={{ padding: "100px" }}>About Page</div>}
      {page === "app" && <div style={{ padding: "100px" }}>App Page</div>}
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
    color: "white",
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

const navBtn = {
  background: "none",
  border: "none",
  color: text,
  cursor: "pointer"
};
