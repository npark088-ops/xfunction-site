"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  computeFrame,
  makeFrame,
  makeGeo,
  makeLayout,
  makeSnapshot,
  paintBreak,
  paintFrame,
  type Frame,
  type Geo,
  type Layout,
  type Snapshot,
} from "./asciiX";

// The ASCII X hero. A real <button> (aria-label "Open xFunction") holding a 2D
// <canvas>.
//
// Two modes, chosen on mount and re-chosen if the window or preferences change:
//   live    >= 1024px wide, no prefers-reduced-motion, no Save-Data / 2G.
//           requestAnimationFrame loop: a slow breathing light sweep and a few
//           degrees of tilt that follows the mouse. Clicking (or Enter/Space)
//           plays a ~1.5 s transition — the characters scramble and stream
//           away, three fixed lines of text appear, the page fades — and then
//           navigates. Click again or press Escape and it navigates at once.
//   static  everything else: the X is drawn ONCE (no loop, no listeners beyond
//           resize) and a click navigates straight away.
//
// Safety: devicePixelRatio is capped at 1.5; the loop stops when the tab is
// hidden or the button is off screen; every listener, observer, timer and
// animation frame is released on unmount. The boot text is three fixed
// strings, rendered as plain text.

const BOOT = ["> loading xFunction", "> opening your planner", "> ready"] as const;
const BOOT_AT = [420, 760, 1100]; // ms after the click
const FADE_AT = 1250;
const NAVIGATE_AT = 1500;

type Conn = { saveData?: boolean; effectiveType?: string };
const saveDataOn = () => {
  const c = (navigator as Navigator & { connection?: Conn }).connection;
  return Boolean(c?.saveData) || c?.effectiveType === "slow-2g" || c?.effectiveType === "2g";
};

export default function AsciiHeroX({ href, onActivate }: { href: string; onActivate?: () => void }) {
  const router = useRouter();
  const btn = useRef<HTMLButtonElement>(null);
  const stage = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  const [live, setLive] = useState<boolean | null>(null); // null until decided
  const [leaving, setLeaving] = useState(false);
  const [bootStep, setBootStep] = useState(0);
  const [veil, setVeil] = useState(false);

  const navigated = useRef(false);
  const timers = useRef<number[]>([]);
  const leave = useRef<{ t0: number; snap: Snapshot } | null>(null);
  const current = useRef<{ layout: Layout; frame: Frame } | null>(null);
  const kick = useRef<() => void>(() => {});
  const go = useRef<() => void>(() => {});

  // Navigate exactly once, cancelling anything still pending.
  useEffect(() => {
    go.current = () => {
      if (navigated.current) return;
      navigated.current = true;
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      router.push(href);
    };
  }, [router, href]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
    []
  );

  // 1. live or static?
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setLive(wide.matches && !reduced.matches && !saveDataOn());
    sync();
    wide.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      wide.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  // 2. draw: once (static) or in a loop (live)
  useEffect(() => {
    if (live === null) return;
    const cv = canvas.current;
    const bt = btn.current;
    const st = stage.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !bt || !st || !ctx) return;

    let layout: Layout | null = null;
    let geo: Geo | null = null;
    let frame: Frame | null = null;

    const resize = () => {
      const size = Math.round(bt.clientWidth);
      if (size < 40) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // capped
      layout = makeLayout(size);
      geo = makeGeo(layout.W, layout.H);
      frame = makeFrame(layout);
      cv.width = Math.round(layout.W * dpr);
      cv.height = Math.round(layout.H * dpr);
      cv.style.width = `${layout.W}px`;
      cv.style.height = `${layout.H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      current.current = { layout, frame };
      return true;
    };

    // ---- static: one still, redrawn only if the size changes ----
    if (!live) {
      st.style.transform = "";
      const drawOnce = () => {
        if (resize() && layout && geo && frame) {
          computeFrame(layout, geo, frame, 0.8, 0, 0);
          paintFrame(ctx, layout, frame);
        }
      };
      drawOnce();
      const ro = new ResizeObserver(drawOnce);
      ro.observe(bt);
      return () => ro.disconnect();
    }

    // ---- live ----
    let raf = 0;
    let inView = true;
    let tabShown = !document.hidden;
    const t0 = performance.now();
    let last = t0;
    const target = { x: 0, y: 0 };
    const mouse = { x: 0, y: 0 };

    const shouldRun = () => (inView && tabShown) || leave.current !== null;

    const tick = (now: number) => {
      raf = 0;
      if (!layout || !geo || !frame) {
        if (!resize()) {
          raf = requestAnimationFrame(tick);
          return;
        }
      }
      if (layout && geo && frame) {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        const k = 1 - Math.exp(-dt * 3.5);
        mouse.x += (target.x - mouse.x) * k;
        mouse.y += (target.y - mouse.y) * k;
        st.style.transform = `perspective(1100px) rotateX(${(-mouse.y * 4).toFixed(2)}deg) rotateY(${(mouse.x * 5).toFixed(2)}deg)`;

        const lv = leave.current;
        if (lv) {
          paintBreak(ctx, layout, lv.snap, now - lv.t0);
        } else {
          computeFrame(layout, geo, frame, (now - t0) / 1000, mouse.x, mouse.y);
          paintFrame(ctx, layout, frame);
        }
      }
      if (shouldRun()) raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf && shouldRun()) raf = requestAnimationFrame(tick);
    };
    kick.current = start;

    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onVisibility = () => {
      tabShown = !document.hidden;
      start();
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        start();
      },
      { threshold: 0 }
    );
    const ro = new ResizeObserver(() => {
      resize();
      start();
    });

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    io.observe(bt);
    ro.observe(bt);
    start();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      ro.disconnect();
      kick.current = () => {};
      st.style.transform = "";
    };
  }, [live]);

  // 3. while the transition runs: click again / Escape / Enter / Space skips it
  useEffect(() => {
    if (!leaving) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go.current();
      }
    };
    const onDown = () => go.current();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [leaving]);

  const activate = () => {
    if (navigated.current) return;
    if (leave.current) {
      go.current(); // a second activation never waits
      return;
    }
    onActivate?.(); // same analytics call the landing page's "App" link makes
    const cur = current.current;
    if (!live || !cur) {
      go.current(); // static / reduced motion: straight there
      return;
    }
    leave.current = { t0: performance.now(), snap: makeSnapshot(cur.layout, cur.frame) };
    setLeaving(true);
    kick.current();
    timers.current = [
      ...BOOT_AT.map((ms, i) => window.setTimeout(() => setBootStep(i + 1), ms)),
      window.setTimeout(() => setVeil(true), FADE_AT),
      window.setTimeout(() => go.current(), NAVIGATE_AT),
    ];
  };

  return (
    <>
      <button
        ref={btn}
        type="button"
        className="hx-btn"
        aria-label="Open xFunction"
        data-live={live ? "true" : "false"}
        onClick={activate}
      >
        <span ref={stage} className="hx-stage">
          <canvas ref={canvas} className="hx-canvas" aria-hidden="true" />
        </span>
      </button>

      {/* fixed strings only */}
      <div className="hx-boot" aria-live="polite" data-on={leaving}>
        {BOOT.slice(0, bootStep).map((line) => (
          <div key={line} className="hx-line" style={{ "--n": line.length } as CSSProperties}>
            {line}
          </div>
        ))}
      </div>

      <div className="hx-veil" data-on={veil} aria-hidden="true" />
    </>
  );
}
