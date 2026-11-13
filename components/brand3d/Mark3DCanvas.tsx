"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- `three` is untyped here (see types/three-shim.d.ts) */

// The ONLY file (with the scenes it imports) that loads three.js and
// @react-three/fiber. It is imported lazily by HeroMark3D through
// next/dynamic with ssr:false, so none of this reaches a page's first load —
// and nothing at all on pages that don't render a HeroMark3D.

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PALETTE, type Theme } from "./palette";
import { MetalScene } from "./scenes/MetalScene";
import { RibbonScene } from "./scenes/RibbonScene";
import { SurfaceScene } from "./scenes/SurfaceScene";

const CAMERA = {
  1: { position: [0, 4.1, 3.8] as [number, number, number], fov: 32 },
  2: { position: [0, 0, 5.8] as [number, number, number], fov: 30 },
  3: { position: [0, 0, 6.6] as [number, number, number], fov: 30 },
};

// Tells the parent the first frame has been drawn (so it can fade the canvas in).
function ReadyPing({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady();
  });
  return null;
}

export default function Mark3DCanvas({
  n,
  theme,
  active,
  onReady,
}: {
  n: 1 | 2 | 3;
  theme: Theme;
  /** false while off screen or in a hidden tab: the render loop stops */
  active: boolean;
  onReady: () => void;
}) {
  const palette = PALETTE[theme];
  const pointer = useRef({ x: 0, y: 0 });
  const glRef = useRef<any>(null);

  // Mouse position over the whole window (-1..1), only while active.
  useEffect(() => {
    if (!active) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [active]);

  // R3F tears down its renderer when <Canvas> unmounts; this makes the
  // release explicit as well (frees the WebGL context's GPU resources).
  useEffect(
    () => () => {
      try {
        glRef.current?.dispose();
      } catch {
        /* already gone */
      }
    },
    []
  );

  const camera = useMemo(() => CAMERA[n], [n]);

  return (
    <Canvas
      // Cap the pixel ratio at 1.5: sharp enough, far cheaper on phones/Chromebooks.
      dpr={[1, 1.5]}
      // "demand" = draw only when something asks; "always" = the animation loop.
      frameloop={active ? "always" : "demand"}
      flat={n === 1}
      camera={camera}
      gl={{ antialias: true, alpha: true, powerPreference: "default" }}
      resize={{ scroll: false }}
      onCreated={({ gl }) => {
        glRef.current = gl;
        if (process.env.NODE_ENV !== "production") {
          // dev-only: lets the preview check that renderers are released
          ((window as any).__b3dRenderers ||= []).push(gl);
        }
      }}
    >
      <ReadyPing onReady={onReady} />
      {n === 1 && <SurfaceScene palette={palette} pointer={pointer} />}
      {n === 2 && <RibbonScene palette={palette} pointer={pointer} />}
      {n === 3 && <MetalScene palette={palette} pointer={pointer} />}
    </Canvas>
  );
}
