import type { MutableRefObject } from "react";
import type { Palette } from "../palette";

export type PointerRef = MutableRefObject<{ x: number; y: number }>;

export type SceneProps = {
  palette: Palette;
  /** mouse position over the window, each axis in -1..1 (smoothed by the scene) */
  pointer: PointerRef;
};

/** Frame-rate independent smoothing of the mouse towards its target. */
export function easePointer(
  smoothed: { x: number; y: number },
  target: { x: number; y: number },
  delta: number
) {
  const k = 1 - Math.exp(-delta * 3);
  smoothed.x += (target.x - smoothed.x) * k;
  smoothed.y += (target.y - smoothed.y) * k;
}
