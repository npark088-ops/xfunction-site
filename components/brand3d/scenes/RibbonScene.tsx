"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- `three` is untyped here (see types/three-shim.d.ts) */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, DoubleSide, DynamicDrawUsage, Float32BufferAttribute } from "three";
import { ribbonFrame, ribbonPoint } from "../math";
import { StudioEnv } from "./StudioEnv";
import { easePointer, type SceneProps } from "./types";

// Concept 2 — "Ribbon X".
// Two satin ribbons (blue in front, deep ink behind) swept along S-shaped
// paths that cross at the centre, each twisting slowly about its own length.
// Lit by a soft procedural studio plus a key and a rim light. The whole group
// floats gently and tilts a few degrees toward the mouse.

const SEG = 150; // samples along each ribbon
const CS = 10; // samples across its width

function makeRibbon() {
  const g = new BufferGeometry();
  const count = (SEG + 1) * (CS + 1);
  const attr = new Float32BufferAttribute(new Float32Array(count * 3), 3);
  attr.setUsage(DynamicDrawUsage);
  g.setAttribute("position", attr);
  const idx: number[] = [];
  for (let i = 0; i < SEG; i++)
    for (let k = 0; k < CS; k++) {
      const a = i * (CS + 1) + k;
      const b = a + 1;
      const c = a + (CS + 1);
      idx.push(a, c, b, b, c, c + 1);
    }
  g.setIndex(idx);
  return g;
}

function fillRibbon(g: any, id: 0 | 1, time: number) {
  const arr = g.attributes.position.array as Float32Array;
  let o = 0;
  for (let i = 0; i <= SEG; i++) {
    const frame = ribbonFrame(id, -1 + (2 * i) / SEG, time);
    for (let k = 0; k <= CS; k++) {
      const p = ribbonPoint(frame, -1 + (2 * k) / CS);
      arr[o++] = p[0];
      arr[o++] = p[1];
      arr[o++] = p[2];
    }
  }
  g.attributes.position.needsUpdate = true;
  g.computeVertexNormals();
}

export function RibbonScene({ palette, pointer }: SceneProps) {
  const geoBlue = useMemo(makeRibbon, []);
  const geoInk = useMemo(makeRibbon, []);
  // Geometry is built by hand, so it is disposed by hand; the materials and
  // meshes written in JSX are disposed by R3F.
  useEffect(() => () => geoBlue.dispose(), [geoBlue]);
  useEffect(() => () => geoInk.dispose(), [geoInk]);

  const group = useRef<any>(null);
  const smoothed = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    easePointer(smoothed.current, pointer.current, delta);
    fillRibbon(geoBlue, 0, t);
    fillRibbon(geoInk, 1, t);
    const g = group.current;
    if (g) {
      g.position.y = Math.sin(t * 0.7) * 0.045;
      g.rotation.y = 0.2 * Math.sin(t * 0.33) + smoothed.current.x * 0.3;
      g.rotation.x = -0.05 + 0.07 * Math.sin(t * 0.45) - smoothed.current.y * 0.2;
      g.rotation.z = 0.03 * Math.sin(t * 0.27);
    }
  });

  return (
    <>
      <StudioEnv intensity={palette.envIntensity} />
      <directionalLight position={[2.5, 3, 4]} intensity={1.1} color="#fff6ea" />
      <directionalLight position={[-3, 2, -3]} intensity={1.5} color="#a9c1ff" />
      <group ref={group}>
        <mesh geometry={geoInk} frustumCulled={false}>
          <meshPhysicalMaterial
            color={palette.ribbonInk}
            roughness={0.26}
            metalness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.1}
            side={DoubleSide}
          />
        </mesh>
        <mesh geometry={geoBlue} frustumCulled={false}>
          <meshPhysicalMaterial
            color={palette.ribbonBlue}
            roughness={0.24}
            metalness={0.05}
            clearcoat={1}
            clearcoatRoughness={0.08}
            side={DoubleSide}
          />
        </mesh>
      </group>
    </>
  );
}
