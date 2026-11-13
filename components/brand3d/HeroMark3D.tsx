"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Poster } from "./FlatMarks";
import type { Theme } from "./palette";

// three.js + @react-three/fiber live in Mark3DCanvas. next/dynamic with
// ssr:false turns that import into a separate chunk that is only fetched once
// <Mark3DCanvas> is actually rendered — which this component does only when
// ALL of these hold:
//   - the viewport is at least 1024px wide
//   - the visitor has no prefers-reduced-motion
//   - Save-Data / a 2G connection is not on
//   - WebGL can really create a context
//   - the hero is on (or about to be on) screen
// Otherwise — and until the 3D scene's first frame — the flat SVG poster of
// the same mark is shown. A visible 3D scene is released again a few seconds
// after it scrolls away.
const Mark3DCanvas = dynamic(() => import("./Mark3DCanvas"), { ssr: false });

type Conn = { saveData?: boolean; effectiveType?: string };
function connectionSaysNo(): boolean {
  const c = (navigator as Navigator & { connection?: Conn }).connection;
  return Boolean(c?.saveData) || c?.effectiveType === "slow-2g" || c?.effectiveType === "2g";
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext(); // release the probe
    return true;
  } catch {
    return false;
  }
}

// Dev-only switch for testing the no-WebGL fallback: add ?nowebgl to the URL.
function devForcesFallback(): boolean {
  return process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).has("nowebgl");
}

// If anything in the 3D tree throws (a lost context, a driver quirk), drop to
// the poster instead of showing an error.
class Boundary extends Component<{ onError: () => void; children: ReactNode }, { bad: boolean }> {
  state = { bad: false };
  static getDerivedStateFromError() {
    return { bad: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.bad ? null : this.props.children;
  }
}

export function HeroMark3D({ n, theme }: { n: 1 | 2 | 3; theme: Theme }) {
  const root = useRef<HTMLDivElement>(null);
  const [capable, setCapable] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [tabShown, setTabShown] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // 1. Is this device/visitor allowed the 3D version at all?
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let webgl: boolean | null = null;
    const sync = () => {
      const ok = wide.matches && !reduced.matches && !connectionSaysNo();
      // only probe WebGL once everything else says yes
      if (ok && webgl === null) webgl = webglAvailable() && !devForcesFallback();
      setCapable(ok && Boolean(webgl));
    };
    sync();
    wide.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      wide.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  // 2. Mount only while the hero is on screen; release it after it leaves.
  useEffect(() => {
    if (!capable || failed) {
      setMounted(false);
      setVisible(false);
      setReady(false);
      return;
    }
    const el = root.current;
    if (!el) return;
    let timer: number | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(timer);
        if (entry.isIntersecting) {
          setVisible(true);
          setMounted(true);
        } else {
          setVisible(false);
          timer = window.setTimeout(() => {
            setMounted(false);
            setReady(false);
          }, 4000);
        }
      },
      { rootMargin: "120px" }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [capable, failed]);

  // 3. Pause while the tab is hidden.
  useEffect(() => {
    const sync = () => setTabShown(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return (
    <div ref={root} className="b3-mark">
      <div className="b3-poster" data-hidden={ready}>
        <Poster n={n} />
      </div>
      {mounted && !failed && (
        <div className="b3-canvas" data-ready={ready}>
          <Boundary
            onError={() => {
              setFailed(true);
              setReady(false);
            }}
          >
            <Mark3DCanvas n={n} theme={theme} active={visible && tabShown} onReady={() => setReady(true)} />
          </Boundary>
        </div>
      )}
    </div>
  );
}
