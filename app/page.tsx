"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [page, setPage] = useState("home");
  const [visible, setVisible] = useState(false);
  const [acceptedCookies, setAcceptedCookies] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  return (
    <div style={{ margin: 0, fontFamily: "Arial" }}>

      {/* NAVBAR */}
      <div style={{
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  padding: "20px 40px",
  color: "white",
  zIndex: 100
}}>
  <h2>XFunction</h2>

  <div style={{ display: "flex", gap: "30px" }}>

    <Link href="/" style={navBtn}>
      Home
    </Link>

    <Link href="/about" style={navBtn}>
      About
    </Link>

    <Link href="/app-page" style={navBtn}>
      App
    </Link>

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

            {/* HERO TEXT */}
            <div style={{
              position: "relative",
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              color: "white",
              padding: "20px"
            }}>
              <div style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0px)" : "translateY(40px)",
                transition: "all 1s ease"
              }}>

                <h1 style={{
                  fontSize: "100px",
                  fontWeight: "600",
                  lineHeight: "1.1"
                }}>
                  XFunction
                </h1>

                <p style={{
                  marginTop: "20px",
                  fontSize: "24px",
                  maxWidth: "700px",
                  marginLeft: "auto",
                  marginRight: "auto"
                }}>
                  A system designed to transform complexity into clarity,
                  enabling consistent execution and long-term progress.
                </p>

              </div>
            </div>

          </div>

          {/* SECTION 1 */}
          <div style={{
  padding: "120px 20px",
  background: "white",
  display: "flex",
  justifyContent: "center"
}}>
  <div style={{
    maxWidth: "900px",
    textAlign: "center",
    padding: "60px",
    borderRadius: "20px",
    background: "#f1f5f9",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
  }}>

    <h2 style={{
      fontSize: "52px",
      fontWeight: "700",
      color: "#111"
    }}>
      Plan less. Execute more.
    </h2>

    <p style={{
      marginTop: "20px",
      fontSize: "20px",
      color: "#333",
      lineHeight: "1.7"
    }}>
      XFunction eliminates the constant need to decide what to do next.
      Instead of repeatedly planning and reorganizing your work, you follow
      a structured system that directs your actions automatically.
    </p>

    <p style={{
      marginTop: "15px",
      fontSize: "20px",
      color: "#333",
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
  background: "white",
  display: "flex",
  justifyContent: "center"
}}>
  <div style={{
    maxWidth: "900px",
    textAlign: "center",
    padding: "60px",
    borderRadius: "20px",
    background: "#f1f5f9",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
  }}>
    <h2 style={{
  fontSize: "52px",
  fontWeight: "700",
  color: "#111"
}}>
      Built for consistency
    </h2>

    <p style={{
      marginTop: "20px",
      fontSize: "20px",
      color: "#444",
      lineHeight: "1.7"
    }}>
      Most systems depend on motivation, which fluctuates over time.
      XFunction replaces that unpredictability with structured workflows
      that guide your actions every day.
    </p>

    <p style={{
      marginTop: "15px",
      fontSize: "20px",
      color: "#444",
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
            background: "#111",
            color: "white"
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
              opacity: 0.8
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
    background: "#111",
    color: "white",
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
          document.cookie = "acceptedCookies=true";
          setAcceptedCookies(true);
        }}
        style={{
          padding: "8px 15px",
          background: "white",
          color: "black",
          border: "none",
          cursor: "pointer"
        }}
      >
        Accept
      </button>

      <button
        onClick={() => setAcceptedCookies(true)}
        style={{
          padding: "8px 15px",
          background: "#333",
          color: "white",
          border: "none",
          cursor: "pointer"
        }}
      >
        Reject
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
  color: "white",
  cursor: "pointer"
};