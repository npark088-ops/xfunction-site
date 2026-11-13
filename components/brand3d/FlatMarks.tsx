import { useId } from "react";
import {
  offsetPolygon,
  pathOf,
  ribbonOutline,
  surfaceWireframe,
  xOutline,
  type V2,
} from "./math";

// ============================================================================
// Flat (SVG) versions of the three 3D concepts.
//   <FlatMark n size mono />  a simple mark drawn on a 64-unit grid that works
//                             at 24px and in ONE colour (mono = currentColor
//                             only) — meant to become the nav logo, favicon and
//                             app icon.
//   <Poster n />              a larger flat picture of the same mark, shown in
//                             place of the 3D scene on phones, school
//                             Chromebooks, reduced-motion / Save-Data visitors,
//                             and when WebGL isn't available.
// Both are generated from the SAME functions as the 3D geometry (math.ts), so
// the flat mark is literally the 3D shape seen from the front.
// Colours come from the marketing palette via CSS variables (with fallbacks),
// so they follow light / dark automatically.
// ============================================================================

const BLUE = "var(--mk-blue, #2563EB)";
const BRASS = "var(--mk-accent, #8A6420)";
const INK = "currentColor";
const GRID = "var(--b3-grid, #8693AE)";
const RIBBON_INK = "var(--b3-ribbon-ink, #111A2B)";
const STEEL_A = "var(--b3-steel-a, #C9D0DE)";
const STEEL_B = "var(--b3-steel-b, #76829C)";

const blue = (mono: boolean) => (mono ? INK : BLUE);
const brass = (mono: boolean) => (mono ? INK : BRASS);

function useUid(prefix: string) {
  return prefix + useId().replace(/[^a-zA-Z0-9]/g, "");
}

// A pointed "ridge": a lens between two points, `b` thick at its middle.
function lens(p0: V2, p1: V2, b: number) {
  const mx = (p0[0] + p1[0]) / 2;
  const my = (p0[1] + p1[1]) / 2;
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const l = Math.hypot(dx, dy);
  const nx = -dy / l;
  const ny = dx / l;
  return (
    `M${p0[0]} ${p0[1]}Q${(mx + nx * b).toFixed(2)} ${(my + ny * b).toFixed(2)} ${p1[0]} ${p1[1]}` +
    `Q${(mx - nx * b).toFixed(2)} ${(my - ny * b).toFixed(2)} ${p0[0]} ${p0[1]}Z`
  );
}

export type FlatProps = { n: 1 | 2 | 3; size?: number; mono?: boolean; className?: string };

/* ---------------------------------------------------------------- 24px marks */

const LENS_A = lens([6, 58], [58, 6], 11); // rising ridge  (blue, in front)
const LENS_B = lens([6, 6], [58, 58], 11); // falling ridge (ink, behind)

function Flat1({ size, mono = false, className }: Omit<FlatProps, "n">) {
  const id = useUid("f1");
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} fill="none" role="img" aria-label="XFunction mark: two ridges crossing">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <path d={LENS_A} fill="#000" stroke="#000" strokeWidth="5.5" strokeLinejoin="round" />
        </mask>
      </defs>
      <path d={LENS_B} mask={`url(#${id})`} style={{ fill: INK }} />
      <path d={LENS_A} style={{ fill: blue(mono) }} />
      {!mono && <circle cx="32" cy="32" r="4.4" style={{ fill: BRASS }} />}
    </svg>
  );
}

const S2 = 25; // world units -> the 64 grid
const RIB_A = pathOf(ribbonOutline(0, 1.55, 0.55), 32, 32, S2, false);
const RIB_B = pathOf(ribbonOutline(1, 1.55, 0.55), 32, 32, S2, false);

function Flat2({ size, mono = false, className }: Omit<FlatProps, "n">) {
  const id = useUid("f2");
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} fill="none" role="img" aria-label="XFunction mark: two ribbons crossing">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <path d={RIB_A} fill="#000" stroke="#000" strokeWidth="4.5" strokeLinejoin="round" />
        </mask>
      </defs>
      <path d={RIB_B} mask={`url(#${id})`} style={{ fill: INK }} />
      <path d={RIB_A} style={{ fill: blue(mono) }} />
    </svg>
  );
}

const X_FLAT = xOutline(29, 7.8, 8.6);
const X_FLAT_PATH = pathOf(X_FLAT, 32, 32, 1);

function Flat3({ size, mono = false, className }: Omit<FlatProps, "n">) {
  const id = useUid("f3");
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} fill="none" role="img" aria-label="XFunction mark: a beveled X">
      <defs>
        <linearGradient id={id} x1="12" y1="8" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: STEEL_A }} />
          <stop offset="1" style={{ stopColor: STEEL_B }} />
        </linearGradient>
      </defs>
      {mono ? (
        <path d={X_FLAT_PATH} style={{ fill: INK }} />
      ) : (
        <path d={X_FLAT_PATH} fill={`url(#${id})`} style={{ stroke: BRASS }} strokeWidth="2.6" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function FlatMark({ n, size = 24, mono = false, className }: FlatProps) {
  if (n === 1) return <Flat1 size={size} mono={mono} className={className} />;
  if (n === 2) return <Flat2 size={size} mono={mono} className={className} />;
  return <Flat3 size={size} mono={mono} className={className} />;
}

/* -------------------------------------------------------------------- posters */

const VIEW = "-2 -1.35 4 2.7";

const WIRE = surfaceWireframe(19, 42);

function Poster1() {
  const id = useUid("p1");
  return (
    <svg viewBox={VIEW} className="b3-poster__svg" fill="none" role="img" aria-label="XFunction mark: a plotted surface whose ridges form an X">
      <defs>
        {/* the same soft fade the 3D mesh has: strong in the middle, gone at the rim */}
        <radialGradient id={`${id}r`} cx="0" cy="-0.05" r="1.5" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 -0.05) scale(1 0.78) translate(0 0.05)">
          <stop offset="0.45" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="-2" y="-1.35" width="4" height="2.7">
          <rect x="-2" y="-1.35" width="4" height="2.7" fill={`url(#${id}r)`} />
        </mask>
      </defs>
      <g mask={`url(#${id}m)`} strokeLinecap="round" strokeLinejoin="round">
        <path d={WIRE.low} style={{ stroke: GRID }} strokeWidth="1" strokeOpacity="0.38" vectorEffect="non-scaling-stroke" />
        <path d={WIRE.mid} style={{ stroke: BLUE }} strokeWidth="1.1" strokeOpacity="0.85" vectorEffect="non-scaling-stroke" />
        <path d={WIRE.high} style={{ stroke: BRASS }} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      </g>
      <circle cx={WIRE.summit[0]} cy={WIRE.summit[1]} r="0.16" style={{ fill: BRASS }} opacity="0.2" />
      <circle cx={WIRE.summit[0]} cy={WIRE.summit[1]} r="0.05" style={{ fill: BRASS }} />
    </svg>
  );
}

const P2_A = pathOf(ribbonOutline(0, 1, 0.3), 0, 0, 1, false);
const P2_B = pathOf(ribbonOutline(1, 1, 0.3), 0, 0, 1, false);

function Poster2() {
  const id = useUid("p2");
  return (
    <svg viewBox={VIEW} className="b3-poster__svg" fill="none" role="img" aria-label="XFunction mark: two ribbons twisting into an X">
      <defs>
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="-2" y="-1.35" width="4" height="2.7">
          <rect x="-2" y="-1.35" width="4" height="2.7" fill="#fff" />
          <path d={P2_A} fill="#000" stroke="#000" strokeWidth="0.07" strokeLinejoin="round" />
        </mask>
        <linearGradient id={`${id}a`} x1="-1" y1="1" x2="1" y2="-1" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "color-mix(in srgb, var(--mk-blue, #2563EB) 78%, #000)" }} />
          <stop offset="0.46" style={{ stopColor: BLUE }} />
          <stop offset="0.56" style={{ stopColor: "color-mix(in srgb, var(--mk-blue, #2563EB) 55%, #fff)" }} />
          <stop offset="1" style={{ stopColor: BLUE }} />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="-1" y1="-1" x2="1" y2="1" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "color-mix(in srgb, var(--b3-ribbon-ink, #111A2B) 75%, #000)" }} />
          <stop offset="0.46" style={{ stopColor: RIBBON_INK }} />
          <stop offset="0.56" style={{ stopColor: "color-mix(in srgb, var(--b3-ribbon-ink, #111A2B) 62%, #8fa3d6)" }} />
          <stop offset="1" style={{ stopColor: RIBBON_INK }} />
        </linearGradient>
      </defs>
      <path d={P2_B} mask={`url(#${id}m)`} fill={`url(#${id}b)`} />
      <path d={P2_A} fill={`url(#${id}a)`} />
    </svg>
  );
}

const X_BIG = xOutline();
const P3_PATH = pathOf(X_BIG, 0, 0, 1);
const P3_INSET = pathOf(offsetPolygon(X_BIG, 0.1), 0, 0, 1);

function Poster3() {
  const id = useUid("p3");
  return (
    <svg viewBox={VIEW} className="b3-poster__svg" fill="none" role="img" aria-label="XFunction mark: a beveled metal X with a brass edge">
      <defs>
        <linearGradient id={`${id}g`} x1="-0.8" y1="-1" x2="0.8" y2="1" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: STEEL_A }} />
          <stop offset="1" style={{ stopColor: STEEL_B }} />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="-1.2" y1="-0.2" x2="1.2" y2="0.2" gradientUnits="userSpaceOnUse">
          <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <path d={P3_PATH} />
        </clipPath>
      </defs>
      <path d={P3_PATH} fill={`url(#${id}g)`} style={{ stroke: BRASS }} strokeWidth="0.06" strokeLinejoin="round" />
      <rect x="-1.4" y="-1.3" width="2.8" height="2.6" fill={`url(#${id}s)`} clipPath={`url(#${id}c)`} transform="rotate(-18)" />
      <path d={P3_INSET} style={{ stroke: BRASS }} strokeWidth="0.012" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

export function Poster({ n }: { n: 1 | 2 | 3 }) {
  if (n === 1) return <Poster1 />;
  if (n === 2) return <Poster2 />;
  return <Poster3 />;
}

export type Concept3D = { n: 1 | 2 | 3; name: string; line: string };

export const CONCEPTS_3D: Concept3D[] = [
  {
    n: 1,
    name: "Function surface",
    line: "A plotted surface z = f(x, y) of points and thin lines. Two ridges rise into an X, and a brass point marks the summit where they cross.",
  },
  {
    n: 2,
    name: "Ribbon X",
    line: "Two satin ribbons — blue in front, deep ink behind — twist and cross in 3D to form the X. Soft studio light, a slow float, and a little parallax that follows the mouse.",
  },
  {
    n: 3,
    name: "Etched metal X",
    line: "A thick, beveled X with a brushed-steel face, a brass edge and a fine etched line, turning slowly under a soft rim light.",
  },
];
