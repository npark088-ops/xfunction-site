"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Wordmark } from "./Wordmark";

const SESSION_KEY = "xf-logo-intro-played";

// sessionStorage can throw (private mode, blocked storage, SSR) — every
// access is wrapped so a failure just means "treat as not played yet".
function hasPlayed(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markPlayed() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

// The XFunction wordmark in the public nav (components/MarketingNav.tsx),
// with its entrance animation. The wordmark is text (components/Wordmark.tsx),
// so the entrance is a fade + slight scale-up — see .xf-logo-intro in
// app/globals.css.
//
// Plays once per browser session:
//  - The animation is ON by default in the CSS, so a first visit
//    animates from the very first paint (no flash of an already-visible
//    logo that then restarts).
//  - If this session already played it, the effect adds the --skip
//    class, which turns the animation off. (A hard reload later in the
//    same session can show the logo a beat late — until hydration — and
//    then appear; client-side navigation back to Home is unaffected.)
//  - "Played" is recorded when the animation ends (or after a fallback
//    timeout, which also covers prefers-reduced-motion, where the CSS
//    disables the animation and `animationend` never fires).
// No React state is used: the class is toggled directly on the element,
// which avoids a re-render and any hydration mismatch.
export function LogoIntro({
  size = "md",
  tone = "auto",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "auto" | "light";
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (hasPlayed()) {
      el.classList.add("xf-logo-intro--skip");
      return;
    }

    const done = () => markPlayed();
    el.addEventListener("animationend", done, { once: true });
    const timeout = window.setTimeout(done, 2000);
    return () => {
      el.removeEventListener("animationend", done);
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <Link href="/" style={{ textDecoration: "none", display: "inline-flex" }} aria-label="XFunction home">
      <span ref={ref} className="xf-logo-intro">
        <Wordmark size={size} tone={tone} />
      </span>
    </Link>
  );
}
