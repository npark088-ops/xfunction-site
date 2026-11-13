"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import {
  BackSide,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  SphereGeometry,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Soft studio lighting for glossy / metal materials, baked into an
// environment map. Nothing is downloaded, and everything created here is
// disposed when the scene unmounts.
//   "room"   — three's stock procedural room of softboxes (good for glossy
//              ribbons).
//   "studio" — our own: a grey gradient dome plus four softboxes. Less bright
//              and more directional than the room, so a metal face reads as
//              steel with a highlight that sweeps across it as it turns,
//              instead of washing out.

function buildStudio() {
  const scene = new Scene();

  const dome = new Mesh(new SphereGeometry(10, 40, 20), new MeshBasicMaterial({ side: BackSide, vertexColors: true }));
  const pos = dome.geometry.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const bottom = new Color("#2b2f38");
  const horizon = new Color("#aab1bf");
  const top = new Color("#dde2ea");
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 10; // -1..1
    if (y < 0) c.copy(horizon).lerp(bottom, Math.min(1, -y * 1.4));
    else c.copy(horizon).lerp(top, Math.min(1, y * 1.4));
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }
  dome.geometry.setAttribute("color", new Float32BufferAttribute(cols, 3));
  scene.add(dome);

  const box = (w: number, h: number, at: [number, number, number], gain: number, color: string) => {
    const m = new Mesh(
      new PlaneGeometry(w, h),
      new MeshBasicMaterial({ color: new Color(color).multiplyScalar(gain), side: DoubleSide })
    );
    m.position.set(at[0], at[1], at[2]);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  box(7, 5, [-5, 5, 6], 5, "#ffffff"); // key: front, upper left
  box(2.2, 8, [7, 1, 3], 3, "#cfe0ff"); // cool strip, right
  box(10, 2.4, [0, 6, -6], 4, "#ffffff"); // overhead strip, behind
  box(2, 8, [-7, 0, -3], 2.2, "#ffe2b8"); // warm strip, back left
  return scene;
}

function disposeScene(scene: any) {
  scene.traverse((o: any) => {
    o.geometry?.dispose?.();
    o.material?.dispose?.();
  });
}

export function StudioEnv({ intensity = 0.9, kind = "room" }: { intensity?: number; kind?: "room" | "studio" }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const source: any = kind === "studio" ? buildStudio() : new RoomEnvironment();
    const target = pmrem.fromScene(source, 0.04);
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      target.dispose(); // also frees target.texture
      pmrem.dispose();
      if (kind === "studio") disposeScene(source);
      else source.dispose?.();
    };
  }, [gl, scene, intensity, kind]);

  return null;
}
