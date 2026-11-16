"use client";

import { useEffect, useRef } from "react";
import { STILL_TIME, drawHero } from "./waveScene";

// Animated background for the home-page hero (replaces the old photo + video
// album). A 2D <canvas> draws the scene in components/hero/waveScene.ts in the
// brand palette. No video, no image download, no library.
//
// Smoothness / cost
//   - requestAnimationFrame, with time-based motion, so speed is the same at
//     60 or 144 Hz and a slow frame never makes anything jump;
//   - the scene is soft (gradients), so it is drawn at a fraction of the
//     screen's pixels and scaled up by CSS: 0.75x on laptops, 0.5x on phones,
//     times a devicePixelRatio capped at 1.5;
//   - if frames run long (a slow phone or Chromebook) the resolution steps
//     down automatically, to a floor of 0.35x.
// Behaviour
//   - the loop stops when the tab is hidden or the hero scrolls off screen;
//   - prefers-reduced-motion: no loop — ONE still frame is drawn (and redrawn
//     on resize); it reacts live if the setting changes;
//   - before JS runs (and if canvas is unavailable) the wrapper's CSS
//     gradient (.xf-hero-bg in app/marketing.css) is what you see;
//   - every listener, observer and animation frame is released on unmount.

const MAX_DPR = 1.5;
const MIN_QUALITY = 0.35;

export default function WaveBackground() {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!el || !cv || !ctx) return;

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700;

    let w = 0;
    let h = 0;
    let quality = coarse ? 0.5 : 0.75;
    let reduced = reducedQuery.matches;
    let inView = true;
    let tabShown = !document.hidden;
    let raf = 0;
    let last = 0;
    let animT = 0; // advances only while running, so pausing never causes a jump
    let slowAcc = 0;
    let slowFrames = 0;

    const resizeCanvas = () => {
      w = el.clientWidth;
      h = el.clientHeight;
      if (w < 2 || h < 2) return false;
      const scale = Math.min(window.devicePixelRatio || 1, MAX_DPR) * quality;
      cv.width = Math.max(2, Math.round(w * scale));
      cv.height = Math.max(2, Math.round(h * scale));
      ctx.setTransform(cv.width / w, 0, 0, cv.height / h, 0, 0);
      return true;
    };

    const markReady = () => {
      if (el.dataset.ready !== "true") el.dataset.ready = "true";
    };

    const drawStill = () => {
      if (!w && !resizeCanvas()) return;
      drawHero(ctx, w, h, STILL_TIME);
      markReady();
    };

    const shouldRun = () => !reduced && inView && tabShown;

    const tick = (now: number) => {
      raf = 0;
      if (!w && !resizeCanvas()) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const dtMs = last ? now - last : 16.7;
      last = now;
      animT += Math.min(dtMs, 50) / 1000;
      drawHero(ctx, w, h, animT);
      markReady();

      // Adaptive resolution: if the average frame is slow, draw fewer pixels.
      if (dtMs < 100) {
        slowAcc += dtMs;
        slowFrames++;
        if (slowFrames >= 90) {
          if (slowAcc / slowFrames > 22 && quality > MIN_QUALITY) {
            quality = Math.max(MIN_QUALITY, quality * 0.8);
            resizeCanvas();
          }
          slowAcc = 0;
          slowFrames = 0;
        }
      }
      if (shouldRun()) raf = requestAnimationFrame(tick);
    };

    const sync = () => {
      if (reduced) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        drawStill();
        return;
      }
      if (shouldRun()) {
        if (!raf) {
          last = 0; // don't count the paused gap as a slow frame
          raf = requestAnimationFrame(tick);
        }
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const onReduced = () => {
      reduced = reducedQuery.matches;
      sync();
    };
    const onVisibility = () => {
      tabShown = !document.hidden;
      sync();
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { threshold: 0 }
    );
    const ro = new ResizeObserver(() => {
      if (resizeCanvas() && reduced) drawStill();
    });

    reducedQuery.addEventListener("change", onReduced);
    document.addEventListener("visibilitychange", onVisibility);
    io.observe(el);
    ro.observe(el);
    resizeCanvas();
    sync();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      reducedQuery.removeEventListener("change", onReduced);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={box} className="xf-hero-bg" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
