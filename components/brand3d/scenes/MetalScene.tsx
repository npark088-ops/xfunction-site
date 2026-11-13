"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- `three` is untyped here (see types/three-shim.d.ts) */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  CanvasTexture,
  ExtrudeGeometry,
  Float32BufferAttribute,
  RepeatWrapping,
  Shape,
} from "three";
import { offsetPolygon, xOutline } from "../math";
import { StudioEnv } from "./StudioEnv";
import { easePointer, type SceneProps } from "./types";

// Concept 3 — "Etched metal X".
// A thick X (the 12-point outline in ../math) extruded with a rounded bevel.
// The flat faces are brushed steel (a fine streak texture drives roughness and
// a hint of bump); the sides and bevel are brass. A hairline brass line is
// etched into each face. It swings slowly under a soft rim light.

const DEPTH = 0.14;
const BEVEL_T = 0.05;
const BEVEL_S = 0.045;

// Fine horizontal streaks, deterministic so the metal looks the same every time.
function makeBrushed() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  g.fillStyle = "#9a9a9a";
  g.fillRect(0, 0, S, S);
  let seed = 1234567;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) {
    const y = rnd() * S;
    const x = rnd() * S;
    const len = 40 + rnd() * 260;
    const v = Math.floor(110 + rnd() * 110);
    g.strokeStyle = `rgba(${v},${v},${v},${0.1 + rnd() * 0.22})`;
    g.lineWidth = 0.6 + rnd() * 0.9;
    for (const ox of [0, -S]) {
      g.beginPath();
      g.moveTo(x + ox, y);
      g.lineTo(x + ox + len, y + (rnd() - 0.5) * 0.8);
      g.stroke();
    }
  }
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(0.8, 0.8);
  return tex;
}

export function MetalScene({ palette, pointer }: SceneProps) {
  const outline = useMemo(() => xOutline(), []);

  const body = useMemo(() => {
    const shape = new Shape();
    outline.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    shape.closePath();
    const geo = new ExtrudeGeometry(shape, {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL_T,
      bevelSize: BEVEL_S,
      bevelSegments: 4,
      curveSegments: 1,
      steps: 1,
    });
    geo.center();
    return geo;
  }, [outline]);

  // The etched hairline: the outline pulled in 0.12, on both faces.
  const etch = useMemo(() => {
    const inset = offsetPolygon(outline, 0.12);
    const z = (DEPTH + 2 * BEVEL_T) / 2 + 0.004;
    const out: number[] = [];
    for (const side of [1, -1]) {
      for (let i = 0; i < inset.length; i++) {
        const a = inset[i];
        const b = inset[(i + 1) % inset.length];
        out.push(a[0], a[1], side * z, b[0], b[1], side * z);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(out, 3));
    return g;
  }, [outline]);

  const brushed = useMemo(makeBrushed, []);

  // Built by hand, disposed by hand (JSX materials/meshes are disposed by R3F).
  useEffect(() => () => body.dispose(), [body]);
  useEffect(() => () => etch.dispose(), [etch]);
  useEffect(() => () => brushed.dispose(), [brushed]);

  const group = useRef<any>(null);
  const smoothed = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    easePointer(smoothed.current, pointer.current, delta);
    const g = group.current;
    if (g) {
      g.rotation.y = 0.85 * Math.sin(t * 0.32) + smoothed.current.x * 0.2;
      g.rotation.x = -0.08 + 0.1 * Math.sin(t * 0.23) - smoothed.current.y * 0.12;
      g.position.y = Math.sin(t * 0.6) * 0.03;
    }
  });

  return (
    <>
      {/* our own gradient-dome studio: steel keeps depth instead of washing out */}
      <StudioEnv kind="studio" intensity={palette.envIntensity} />
      <directionalLight position={[-3, 3.5, 5]} intensity={0.8} color="#fff4e4" />
      {/* soft rim light from behind */}
      <directionalLight position={[-3, 2.4, -4]} intensity={2.4} color="#a9c0ff" />
      <group ref={group}>
        <mesh geometry={body} frustumCulled={false}>
          {/* material 0: the two flat faces — brushed steel */}
          <meshPhysicalMaterial
            attach="material-0"
            color={palette.metalFace}
            metalness={1}
            roughness={0.46}
            roughnessMap={brushed}
            bumpMap={brushed}
            bumpScale={1.2}
            anisotropy={0.5}
          />
          {/* material 1: the sides and bevel — brass */}
          <meshStandardMaterial attach="material-1" color={palette.metalEdge} metalness={1} roughness={0.3} />
        </mesh>
        <lineSegments geometry={etch} frustumCulled={false}>
          <lineBasicMaterial color={palette.metalEdge} transparent opacity={0.9} />
        </lineSegments>
      </group>
    </>
  );
}
