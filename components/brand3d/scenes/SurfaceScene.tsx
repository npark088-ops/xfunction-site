"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- `three` is untyped here (see types/three-shim.d.ts) */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BufferGeometry, CanvasTexture, Color, DynamicDrawUsage, Float32BufferAttribute } from "three";
import { SURFACE, smooth, surfaceZ } from "../math";
import { easePointer, type SceneProps } from "./types";

// Concept 1 — "Function surface".
// A grid of points joined by thin lines, plotted as z = f(x, y) (see
// surfaceZ in ../math). Two ridges rise into an X; the brass marker sits on the
// summit where they cross. Positions and colours update on the CPU every frame
// (about 1,900 vertices — trivial) so the surface can breathe slowly.

function radialTexture(stops: [number, string][]) {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  return new CanvasTexture(c);
}

export function SurfaceScene({ palette, pointer }: SceneProps) {
  const { n, half } = SURFACE;
  const dpr = useThree((s) => s.viewport.dpr);

  // --- geometry (one shared set of vertex buffers for points AND lines) -----
  const data = useMemo(() => {
    const count = n * n;
    const pos = new Float32Array(count * 3);
    const step = (2 * half) / (n - 1);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const v = j * n + i;
        pos[v * 3] = -half + i * step;
        pos[v * 3 + 1] = -half + j * step;
      }
    const edges: number[] = [];
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const a = j * n + i;
        if (i < n - 1) edges.push(a, a + 1);
        if (j < n - 1) edges.push(a, a + n);
      }
    const posAttr = new Float32BufferAttribute(pos, 3);
    // RGBA per vertex: alpha fades the quiet grid and the plot's rim, so only
    // the ridges stay strong and there is no hard square edge.
    const colAttr = new Float32BufferAttribute(new Float32Array(count * 4), 4);
    posAttr.setUsage(DynamicDrawUsage);
    colAttr.setUsage(DynamicDrawUsage);
    const geoPoints = new BufferGeometry();
    geoPoints.setAttribute("position", posAttr);
    geoPoints.setAttribute("color", colAttr);
    const geoLines = new BufferGeometry();
    geoLines.setAttribute("position", posAttr);
    geoLines.setAttribute("color", colAttr);
    geoLines.setIndex(edges);
    return { count, posAttr, colAttr, geoPoints, geoLines };
  }, [n, half]);

  const dotTex = useMemo(
    () => radialTexture([[0, "rgba(255,255,255,1)"], [0.6, "rgba(255,255,255,1)"], [0.72, "rgba(255,255,255,0)"], [1, "rgba(255,255,255,0)"]]),
    []
  );
  const glowTex = useMemo(
    () => radialTexture([[0, "rgba(255,255,255,0.95)"], [0.3, "rgba(255,255,255,0.35)"], [1, "rgba(255,255,255,0)"]]),
    []
  );

  // Geometry and textures are created by hand, so they are disposed by hand.
  // (Materials and meshes written in JSX below are disposed by R3F itself.)
  useEffect(() => () => { data.geoPoints.dispose(); data.geoLines.dispose(); }, [data]);
  useEffect(() => () => dotTex.dispose(), [dotTex]);
  useEffect(() => () => glowTex.dispose(), [glowTex]);

  const colors = useMemo(
    () => ({ grid: new Color(palette.grid), blue: new Color(palette.blue), brass: new Color(palette.brass) }),
    [palette]
  );

  const outer = useRef<any>(null);
  const inner = useRef<any>(null);
  const sphere = useRef<any>(null);
  const stem = useRef<any>(null);
  const glow = useRef<any>(null);
  const smoothed = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    easePointer(smoothed.current, pointer.current, delta);

    const pos = data.posAttr.array as Float32Array;
    const col = data.colAttr.array as Float32Array;
    const { grid, blue, brass } = colors;
    for (let v = 0; v < data.count; v++) {
      const x = pos[v * 3];
      const y = pos[v * 3 + 1];
      const z = surfaceZ(x, y, t);
      pos[v * 3 + 2] = z;
      const h = Math.min(1, z / 0.55);
      const wBlue = smooth(0.08, 0.7, h);
      const wBrass = Math.exp(-(x * x + y * y) / 0.026) * smooth(0.5, 1, h);
      const r = grid.r + (blue.r - grid.r) * wBlue;
      const g = grid.g + (blue.g - grid.g) * wBlue;
      const b = grid.b + (blue.b - grid.b) * wBlue;
      col[v * 4] = r + (brass.r - r) * wBrass;
      col[v * 4 + 1] = g + (brass.g - g) * wBrass;
      col[v * 4 + 2] = b + (brass.b - b) * wBrass;
      const fade = 1 - smooth(0.8, 1.25, Math.hypot(x, y) / half);
      col[v * 4 + 3] = fade * (0.3 + 0.7 * wBlue);
    }
    data.posAttr.needsUpdate = true;
    data.colAttr.needsUpdate = true;

    // brass marker rides the summit
    const peak = surfaceZ(0, 0, t);
    if (sphere.current) sphere.current.position.z = peak;
    if (glow.current) glow.current.position.z = peak;
    if (stem.current) {
      stem.current.scale.y = peak;
      stem.current.position.z = peak / 2;
    }

    // slow sway + a little parallax
    if (outer.current) outer.current.rotation.x = -Math.PI / 2 + smoothed.current.y * 0.05;
    if (inner.current) inner.current.rotation.z = 0.32 * Math.sin(t * 0.16) + smoothed.current.x * 0.18;
  });

  return (
    <group ref={outer} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <group ref={inner}>
        <lineSegments geometry={data.geoLines} frustumCulled={false}>
          <lineBasicMaterial vertexColors transparent opacity={0.9} depthWrite={false} />
        </lineSegments>
        <points geometry={data.geoPoints} frustumCulled={false}>
          <pointsMaterial
            vertexColors
            size={2 * dpr}
            sizeAttenuation={false}
            map={dotTex}
            transparent
            depthWrite={false}
          />
        </points>

        {/* brass highlight at the crossing: marker, stem, soft glow */}
        <mesh ref={stem} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 1, 8]} />
          <meshBasicMaterial color={palette.brass} transparent opacity={0.5} />
        </mesh>
        <mesh ref={sphere}>
          <sphereGeometry args={[0.036, 24, 16]} />
          <meshBasicMaterial color={palette.brassGlow} />
        </mesh>
        <sprite ref={glow} scale={[0.6, 0.6, 1]}>
          <spriteMaterial map={glowTex} color={palette.brassGlow} transparent opacity={0.5} depthWrite={false} />
        </sprite>
      </group>
    </group>
  );
}
