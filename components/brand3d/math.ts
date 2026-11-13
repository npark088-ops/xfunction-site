// Pure geometry shared by the 3D scenes AND the flat posters / 24px marks, so
// a flat mark is literally the same shape as its 3D counterpart. No three.js
// import here — this file is safe to load on the server and costs almost
// nothing in the first-load bundle.

export const TAU = Math.PI * 2;

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export type V2 = [number, number];
export type V3 = [number, number, number];

/* ============================================================================
   CONCEPT 1 — Function surface:  z = f(x, y)
   Two Gaussian ridges, one along y = x and one along y = -x. Seen from above
   they form an X; where they cross the heights add, so the crossing is the
   summit (that's where the brass highlight sits). A very small ripple and a
   slow outward "breathing" keep it alive without ever looking busy.
   ========================================================================== */
export const SURFACE = { half: 1.25, n: 38, sigma: 0.15, amp: 0.42 };

export function surfaceZ(x: number, y: number, t: number): number {
  const { half, sigma, amp } = SURFACE;
  const r = Math.hypot(x, y);
  const d1 = (y - x) / Math.SQRT2; // distance to the line y = x
  const d2 = (y + x) / Math.SQRT2; // distance to the line y = -x
  const edge = 1 - smooth(0.74 * half, half, Math.max(Math.abs(x), Math.abs(y)));
  const breathe = 1 + 0.1 * Math.sin(TAU * (0.08 * t - 0.5 * r));
  const ridges = Math.exp(-(d1 * d1) / (sigma * sigma)) + Math.exp(-(d2 * d2) / (sigma * sigma));
  const ripple = 0.03 * Math.sin(3.1 * x + 0.45 * t) * Math.cos(2.7 * y - 0.35 * t);
  return (ridges * amp * breathe + ripple) * edge;
}

/** Projection used by the static poster: the camera looks down at ELEV. */
export const ELEV = (47 * Math.PI) / 180;
export function projectSurface(x: number, y: number, z: number): V2 {
  return [x, -(z * Math.cos(ELEV) + y * Math.sin(ELEV))];
}

/** Wireframe of the surface at t = 0 as SVG path strings, split into three
 *  height bands so the poster can colour ridges blue and the summit brass. */
export function surfaceWireframe(lines = 21, samples = 42) {
  const { half, amp } = SURFACE;
  const bands: string[][] = [[], [], []];
  const bandOf = (z: number) => {
    const h = z / (amp * 1.9);
    return h < 0.16 ? 0 : h < 0.55 ? 1 : 2;
  };
  const run = (pts: V3[]) => {
    let cur = -1;
    let d = "";
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const band = bandOf((a[2] + b[2]) / 2);
      const pa = projectSurface(a[0], a[1], a[2]);
      const pb = projectSurface(b[0], b[1], b[2]);
      if (band !== cur) {
        if (d) bands[cur].push(d);
        d = `M${pa[0].toFixed(2)} ${pa[1].toFixed(2)}`;
        cur = band;
      }
      d += `L${pb[0].toFixed(2)} ${pb[1].toFixed(2)}`;
    }
    if (d) bands[cur].push(d);
  };
  for (let l = 0; l < lines; l++) {
    const c = -half + (2 * half * l) / (lines - 1);
    const row: V3[] = [];
    const col: V3[] = [];
    for (let s = 0; s < samples; s++) {
      const u = -half + (2 * half * s) / (samples - 1);
      row.push([u, c, surfaceZ(u, c, 0)]);
      col.push([c, u, surfaceZ(c, u, 0)]);
    }
    run(row);
    run(col);
  }
  const peak = surfaceZ(0, 0, 0);
  return {
    low: bands[0].join(""),
    mid: bands[1].join(""),
    high: bands[2].join(""),
    summit: projectSurface(0, 0, peak),
  };
}

/* ============================================================================
   CONCEPT 2 — Ribbon X
   Two satin ribbons on gently S-shaped paths. The blue one passes in FRONT of
   the crossing, the ink one BEHIND it, and each twists slowly along its length
   so you see both faces catch the light. Everything is a function of (id, t)
   with t in [-1, 1] along the ribbon.
   ========================================================================== */
export const RIBBON = { L: 1.08, hw: 0.2, sep: 0.16, arch: 0.18 };

const sgn = (id: 0 | 1) => (id === 0 ? 1 : -1);

export function ribbonCenter(id: 0 | 1, t: number): V3 {
  const { L, sep } = RIBBON;
  const s = sgn(id);
  return [L * t, s * (L * 0.9 * t + 0.1 * Math.sin(Math.PI * t)), s * sep * Math.cos((Math.PI * t) / 2)];
}

export const ribbonHalfWidth = (t: number) => RIBBON.hw * (0.72 + 0.28 * Math.cos((Math.PI * t) / 2));
export const ribbonTwist = (id: 0 | 1, t: number, time = 0) =>
  sgn(id) * (1.1 * t + 0.22 * Math.sin(0.5 * time + id * 2) * t);

const norm = (v: V3): V3 => {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
};
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export type RibbonFrame = { c: V3; w: V3; n: V3; hw: number };

/** Position + orthonormal frame of ribbon `id` at parameter t. `w` runs across
 *  the ribbon's width, `n` is its face normal (twisting about the tangent). */
export function ribbonFrame(id: 0 | 1, t: number, time = 0): RibbonFrame {
  const e = 1e-3;
  const a = ribbonCenter(id, t - e);
  const b = ribbonCenter(id, t + e);
  const T = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
  const w0 = norm(cross(T, [0, 0, 1]));
  const n0 = cross(w0, T);
  const phi = ribbonTwist(id, t, time);
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  return {
    c: ribbonCenter(id, t),
    w: [w0[0] * cp + n0[0] * sp, w0[1] * cp + n0[1] * sp, w0[2] * cp + n0[2] * sp],
    n: [-w0[0] * sp + n0[0] * cp, -w0[1] * sp + n0[1] * cp, -w0[2] * sp + n0[2] * cp],
    hw: ribbonHalfWidth(t),
  };
}

/** A point on the ribbon's face; u in [-1, 1] across its width. The face is
 *  very slightly arched so it reads as satin, not as a flat sheet. */
export function ribbonPoint(f: RibbonFrame, u: number, boost = 1): V3 {
  const h = f.hw * boost;
  const arch = RIBBON.arch * h * (1 - u * u);
  return [
    f.c[0] + f.w[0] * u * h + f.n[0] * arch,
    f.c[1] + f.w[1] * u * h + f.n[1] * arch,
    f.c[2] + f.w[2] * u * h + f.n[2] * arch,
  ];
}

/** Outline of a ribbon seen from the front, as 2D points (y flipped for SVG).
 *  `minW` stops the twist from pinching the ribbon to a hairline. */
export function ribbonOutline(id: 0 | 1, boost = 1, minW = 0.3, steps = 56): V2[] {
  const left: V2[] = [];
  const right: V2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = -1 + (2 * i) / steps;
    const f = ribbonFrame(id, t, 0);
    const wl = Math.hypot(f.w[0], f.w[1]) || 1;
    const k = Math.max(minW, wl) / wl;
    const dx = f.w[0] * f.hw * boost * k;
    const dy = f.w[1] * f.hw * boost * k;
    left.push([f.c[0] - dx, -(f.c[1] - dy)]);
    right.push([f.c[0] + dx, -(f.c[1] + dy)]);
  }
  return [...left, ...right.reverse()];
}

/* ============================================================================
   CONCEPT 3 — Etched metal X
   A bold X whose arms flare slightly toward the ends (a "trumpet" waist), so
   it isn't just two bars crossing. 12 points, counter-clockwise.
   ========================================================================== */
export function xOutline(R = 1.18, ew = 0.31, rn = 0.34): V2[] {
  const pts: V2[] = [];
  for (let k = 0; k < 4; k++) {
    const th = Math.PI / 4 + (k * Math.PI) / 2;
    const ux = Math.cos(th);
    const uy = Math.sin(th);
    const px = Math.sin(th);
    const py = -Math.cos(th);
    pts.push([R * ux + ew * px, R * uy + ew * py]);
    pts.push([R * ux - ew * px, R * uy - ew * py]);
    const nth = th + Math.PI / 4;
    pts.push([rn * Math.cos(nth), rn * Math.sin(nth)]);
  }
  return pts;
}

/** Inset a counter-clockwise polygon by distance d (mitred corners). */
export function offsetPolygon(pts: V2[], d: number): V2[] {
  const n = pts.length;
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const e1: V2 = [p1[0] - p0[0], p1[1] - p0[1]];
    const e2: V2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(e1[0], e1[1]) || 1;
    const l2 = Math.hypot(e2[0], e2[1]) || 1;
    // inward (left) normals of a CCW polygon
    const n1: V2 = [-e1[1] / l1, e1[0] / l1];
    const n2: V2 = [-e2[1] / l2, e2[0] / l2];
    const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    out.push([p1[0] + (n1[0] + n2[0]) * k, p1[1] + (n1[1] + n2[1]) * k]);
  }
  return out;
}

export const pathOf = (pts: V2[], dx = 0, dy = 0, s = 1, flipY = true) =>
  pts
    .map((p, i) => `${i ? "L" : "M"}${(dx + p[0] * s).toFixed(2)} ${(dy + (flipY ? -p[1] : p[1]) * s).toFixed(2)}`)
    .join("") + "Z";
