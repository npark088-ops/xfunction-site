"use client";

import Link from "next/link";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

export default function About() {
  return (
    <div
  style={{
    fontFamily: "Inter, sans-serif",
    color: text,
    background: bg,
    minHeight: "100vh"
  }}
>

      {/* ✅ NAVBAR */}
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
          zIndex: 100
        }}
      >
        <h2 style={{ color: blue }}>XFunction</h2>

        <div style={{ display: "flex", gap: "30px" }}>

          <Link
  href="/"
  style={navLink}
  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
>
  Home
</Link>

         <Link
  href="/about"
  style={navLink}
  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
>
  About
</Link>

          <Link
  href="/pricing"
  style={navLink}
  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
>
  Pricing
</Link>

          <Link
  href="/overview"
  style={navLink}
  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
>
  App
</Link>

        </div>
      </div>

      {/* HERO */}
      <div
  style={{
    height: "70vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "20px",
    marginTop: "80px",
    background: `radial-gradient(circle at center, ${card}, transparent 70%)`
  }}
>
        <div style={{ maxWidth: "800px" }}>
          <h1 style={{
  fontSize: "64px",
  fontWeight: "600",
  color: text
}}>
  About XFunction
</h1>

          <p
            style={{
              marginTop: "20px",
              fontSize: "22px",
              color: textDim,
              lineHeight: "1.6"
            }}
          >
            XFunction is designed to eliminate the gap between planning
            and execution, enabling consistent, structured progress over time.
          </p>
        </div>
      </div>

      {/* SECTION 1 */}
      <div style={{
        padding: "120px 20px",
        display: "flex",
        justifyContent: "center"
      }}>
        <div style={{
          maxWidth: "900px",
          padding: "60px",
          borderRadius: "20px",
          background: card,
          border: `1px solid ${border}`
        }}>
          <h2 style={{ fontSize: "48px", fontWeight: "700", color: text }}>
            The problem
          </h2>

          <p style={{ marginTop: "20px", fontSize: "20px", color: textDim, lineHeight: "1.7" }}>
            Most productivity systems rely heavily on constant planning,
            reconsideration, and motivation. This creates friction and leads
            to inconsistent execution.
          </p>

          <p style={{ marginTop: "15px", fontSize: "20px", color: textDim, lineHeight: "1.7" }}>
            Over time, this inconsistency prevents meaningful progress and
            makes even simple tasks feel overwhelming.
          </p>
        </div>
      </div>

      {/* SECTION 2 */}
      <div style={{
        padding: "120px 20px",
        display: "flex",
        justifyContent: "center"
      }}>
        <div style={{
          maxWidth: "900px",
          padding: "60px",
          borderRadius: "20px",
          background: card,
          border: `1px solid ${border}`
        }}>
          <h2 style={{ fontSize: "48px", fontWeight: "700", color: text }}>
            What XFunction does
          </h2>

          <p style={{ marginTop: "20px", fontSize: "20px", color: textDim, lineHeight: "1.7" }}>
            XFunction transforms complex workflows into structured systems.
            Instead of deciding what to do next, users follow predefined
            steps that guide execution.
          </p>

          <p style={{ marginTop: "15px", fontSize: "20px", color: textDim, lineHeight: "1.7" }}>
            This removes indecision, reduces wasted time, and allows users
            to focus entirely on making progress.
          </p>
        </div>
      </div>

      {/* SECTION 3 */}
      <div style={{
        padding: "120px 20px",
        display: "flex",
        justifyContent: "center"
      }}>
        <div style={{
          maxWidth: "900px",
          padding: "60px",
          borderRadius: "20px",
          background: card,
          border: `1px solid ${border}`
        }}>
          <h2 style={{ fontSize: "48px", fontWeight: "700", color: text }}>
            Our approach
          </h2>

          <p style={{ marginTop: "20px", fontSize: "20px", color: textDim, lineHeight: "1.7" }}>
            By simplifying decisions and structuring workflows, XFunction
            enables consistent execution regardless of external factors.
          </p>

          <p style={{ marginTop: "15px", fontSize: "20px", color: textDim, lineHeight: "1.7" }}>
            The result is a system that supports long-term productivity
            through clarity, structure, and repetition.
          </p>
        </div>
      </div>

      {/* FINAL SECTION */}
      <div style={{
        padding: "140px 20px",
        textAlign: "center",
        background: card,
        borderTop: `1px solid ${border}`,
        color: text
      }}>
        <h2 style={{ fontSize: "44px" }}>
          Designed for real progress
        </h2>

        <p style={{
          marginTop: "20px",
          fontSize: "18px",
          maxWidth: "700px",
          margin: "0 auto",
          color: textDim
        }}>
          XFunction is not about doing more work.
          It’s about creating systems that make progress inevitable.
        </p>
      </div>

    </div>
  );
}

/* ✅ NAV LINK STYLE */
const navLink = {
  textDecoration: "none",
  color: "#0F172A",
  fontSize: "16px",
  cursor: "pointer",
  transition: "opacity 0.3s"
};
