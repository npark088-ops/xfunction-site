// Pure rendering maths for the ASCII hero X (no DOM, no React).
//
// The X is two round bars (capsules) crossing: the RISING bar (bottom-left to
// top-right) lies on top; the FALLING bar lies slightly behind it and takes a
// soft shadow from it. Every character cell is shaded as if it were a pixel of
// that 3D shape: diffuse + a specular highlight + a faint rim light, with a
// slow light sweep along the top bar. The shade picks a character from RAMP
// (dim -> bright) and a colour from a blue -> white ramp (with a touch of
// brass on the top bar's rim light). Drawn from scratch; nothing borrowed.

export const RAMP = " .:-=+*#%@";

// Glyphs used while the X scrambles and streams away. Fixed string.
export const SCRAMBLE = "01<>/\\|{}[]#%@$&*+=-:;?!xX";

export type Layout = {
  cols: number;
  rows: number;
  cw: number;
  ch: number;
  W: number;
  H: number;
  font: string;
};

/** Cell grid for a square-ish area of `size` CSS px. */
export function makeLayout(size: number): Layout {
  const cols = Math.max(36, Math.min(78, Math.round(size / 7.6)));
  const cw = size / cols;
  const ch = cw * 1.65;
  const rows = Math.max(1, Math.floor(size / ch));
  return {
    cols,
    rows,
    cw,
    ch,
    W: size,
    H: rows * ch,
    font: `600 ${Math.round(ch * 0.9)}px ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`,
  };
}

// ---- colour ramps (64 steps each; a brass copy follows at +64) -------------
type Stop = [number, number, number, number]; // position, r, g, b
const BLUE_STOPS: Stop[] = [
  [0, 22, 44, 104], // dim blue at the edges
  [0.35, 37, 99, 235], // brand blue #2563EB
  [0.7, 124, 166, 255], // light blue
  [1, 255, 255, 255], // white in the highlights
];
const BRASS_STOPS: Stop[] = [
  [0, 70, 52, 20],
  [0.5, 168, 128, 56], // brass
  [1, 244, 222, 168],
];

function buildRamp(stops: Stop[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < 64; i++) {
    const t = i / 63;
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const a = stops[k];
    const b = stops[k + 1];
    const u = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0])));
    const c = (j: 1 | 2 | 3) => Math.round(a[j] + (b[j] - a[j]) * u);
    out.push(`rgb(${c(1)},${c(2)},${c(3)})`);
  }
  return out;
}
export const LUT: string[] = [...buildRamp(BLUE_STOPS), ...buildRamp(BRASS_STOPS)];

// ---- geometry ---------------------------------------------------------------
export type Geo = { r: number; L: number; zB: number };

export function makeGeo(W: number, H: number): Geo {
  const S = Math.min(W, H);
  const r = 0.082 * S;
  return { r, L: 0.3 * S, zB: -0.8 * r };
}

export type Light = { x: number; y: number; z: number; hx: number; hy: number; hz: number };

/** Light from the upper left, a little in front; mouse + time nudge it. */
export function makeLight(mx: number, my: number, t: number): Light {
  let x = -0.45 + mx * 0.22 + 0.1 * Math.sin(t * 0.5);
  let y = 0.55 + my * 0.14 + 0.06 * Math.cos(t * 0.37);
  let z = 0.7;
  const m = Math.hypot(x, y, z);
  x /= m;
  y /= m;
  z /= m;
  // half vector towards a viewer straight on (0,0,1)
  let hx = x;
  let hy = y;
  let hz = z + 1;
  const hm = Math.hypot(hx, hy, hz);
  hx /= hm;
  hy /= hm;
  hz /= hm;
  return { x, y, z, hx, hy, hz };
}

type Seg = { d: number; vx: number; vy: number; s: number };

function seg(ax: number, ay: number, bx: number, by: number, px: number, py: number, o: Seg) {
  const dx = bx - ax;
  const dy = by - ay;
  let s = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  s = s < 0 ? 0 : s > 1 ? 1 : s;
  const vx = px - (ax + dx * s);
  const vy = py - (ay + dy * s);
  o.d = Math.sqrt(vx * vx + vy * vy);
  o.vx = vx;
  o.vy = vy;
  o.s = s;
}

const sa: Seg = { d: 0, vx: 0, vy: 0, s: 0 };
const sb: Seg = { d: 0, vx: 0, vy: 0, s: 0 };
const sc: Seg = { d: 0, vx: 0, vy: 0, s: 0 };

const smooth01 = (x: number) => {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
};

/** Shade one cell. (px, py) are in px from the centre, y up. Writes the ramp
 *  index (0 = empty) to out[0] and the colour-LUT index to out[1]. */
export function shadeCell(px: number, py: number, g: Geo, li: Light, t: number, out: [number, number]) {
  const { r, L } = g;
  // top bar A: (-L,-L) -> (L,L); lower bar B: (-L,L) -> (L,-L)
  seg(-L, -L, L, L, px, py, sa);
  seg(-L, L, L, -L, px, py, sb);

  let hit = 0;
  let d = 0;
  let vx = 0;
  let vy = 0;
  let s = 0;
  let z0 = 0;
  if (sa.d < r) {
    hit = 1;
    d = sa.d;
    vx = sa.vx;
    vy = sa.vy;
    s = sa.s;
  } else if (sb.d < r) {
    hit = 2;
    d = sb.d;
    vx = sb.vx;
    vy = sb.vy;
    s = sb.s;
    z0 = g.zB;
  }
  if (!hit) {
    out[0] = 0;
    out[1] = 0;
    return;
  }

  const nz = Math.sqrt(Math.max(0, 1 - (d / r) * (d / r)));
  const nx = vx / r;
  const ny = vy / r;
  const diff = Math.max(0, nx * li.x + ny * li.y + nz * li.z);
  const nh = Math.max(0, nx * li.hx + ny * li.hy + nz * li.hz);
  const spec = Math.pow(nh, 28);
  const rim = Math.pow(1 - nz, 2.4);
  let b = 0.1 + 0.6 * diff + 0.95 * spec + 0.18 * rim;
  let brass = 0;

  if (hit === 1) {
    // rim light from the lower right, tinted brass
    const rl = Math.max(0, nx * 0.7 - ny * 0.6);
    brass = Math.min(1, rim * rl * 2.4);
    b += 0.1 * brass;
    // a slow light sweep travelling along the bar
    const u = s - (0.5 + 0.48 * Math.sin(t * 0.5));
    b += 0.2 * Math.exp(-(u * u) / 0.018) * nz;
  } else {
    // the lower bar sits a little back and takes a soft shadow from the top bar
    const surfZ = z0 + nz * r;
    const gap = Math.max(0.2 * r, 0.55 * r - surfZ);
    seg(-L, -L, L, L, px + (li.x / li.z) * gap, py + (li.y / li.z) * gap, sc);
    const shadow = smooth01((1.35 * r - sc.d) / (0.8 * r));
    b *= 0.82 * (1 - 0.85 * shadow);
  }

  const tone = 1 - Math.exp(-1.5 * b);
  const idx = Math.max(1, Math.min(9, Math.floor(tone * 10)));
  let ci = Math.min(63, Math.floor(tone * 63));
  if (brass > 0.55) ci += 64;
  out[0] = idx;
  out[1] = ci;
}

export type Frame = { chars: Uint8Array; colors: Uint8Array };

export function makeFrame(l: Layout): Frame {
  return { chars: new Uint8Array(l.cols * l.rows), colors: new Uint8Array(l.cols * l.rows) };
}

/** Compute the shaded grid for time t (seconds) and mouse (mx,my in -1..1). */
export function computeFrame(l: Layout, g: Geo, f: Frame, t: number, mx: number, my: number) {
  const li = makeLight(mx, my, t);
  const k = 1 + 0.012 * Math.sin(t * 0.9); // a slow "breath"
  const out: [number, number] = [0, 0];
  for (let j = 0; j < l.rows; j++) {
    const py = (l.H / 2 - (j + 0.5) * l.ch) / k;
    for (let i = 0; i < l.cols; i++) {
      const px = ((i + 0.5) * l.cw - l.W / 2) / k;
      shadeCell(px, py, g, li, t, out);
      const n = j * l.cols + i;
      f.chars[n] = out[0];
      f.colors[n] = out[1];
    }
  }
}

export function paintFrame(ctx: CanvasRenderingContext2D, l: Layout, f: Frame) {
  ctx.clearRect(0, 0, l.W, l.H);
  ctx.font = l.font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 1;
  let last = -1;
  for (let j = 0; j < l.rows; j++) {
    for (let i = 0; i < l.cols; i++) {
      const n = j * l.cols + i;
      const c = f.chars[n];
      if (!c) continue;
      if (f.colors[n] !== last) {
        last = f.colors[n];
        ctx.fillStyle = LUT[last];
      }
      ctx.fillText(RAMP[c], (i + 0.5) * l.cw, (j + 0.5) * l.ch);
    }
  }
}

// ---- the click transition ---------------------------------------------------
export type Snapshot = {
  chars: Uint8Array;
  colors: Uint8Array;
  delay: Float32Array; // ms before a cell lets go
  accel: Float32Array; // px / ms^2 once it falls
  drift: Float32Array; // sideways px / s
};

export function makeSnapshot(l: Layout, f: Frame): Snapshot {
  const n = l.cols * l.rows;
  const snap: Snapshot = {
    chars: f.chars.slice(),
    colors: f.colors.slice(),
    delay: new Float32Array(n),
    accel: new Float32Array(n),
    drift: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / l.cols);
    // top rows let go first, so the X seems to pour downward
    snap.delay[i] = 120 + Math.random() * 260 + (row / l.rows) * 220;
    snap.accel[i] = 0.0012 + Math.random() * 0.0024;
    snap.drift[i] = (Math.random() - 0.5) * 36;
  }
  return snap;
}

/** Duration after which every glyph has faded out. */
export const BREAK_MS = 1250;

export function paintBreak(ctx: CanvasRenderingContext2D, l: Layout, s: Snapshot, ms: number) {
  ctx.clearRect(0, 0, l.W, l.H);
  ctx.font = l.font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const tick = Math.floor(ms / 55);
  let last = -1;
  for (let n = 0; n < s.chars.length; n++) {
    if (!s.chars[n]) continue;
    const col = n % l.cols;
    const row = (n / l.cols) | 0;
    const x = (col + 0.5) * l.cw;
    const y = (row + 0.5) * l.ch;
    const seed = ((n * 2654435761) ^ (tick * 40503)) >>> 0;
    const glyph = SCRAMBLE[seed % SCRAMBLE.length];
    const ti = ms - s.delay[n];
    if (s.colors[n] !== last) {
      last = s.colors[n];
      ctx.fillStyle = LUT[last];
    }
    if (ti < 0) {
      // scrambling in place
      ctx.globalAlpha = 1;
      ctx.fillText(glyph, x + (((seed >> 3) % 3) - 1) * 0.8, y);
    } else {
      const alpha = 1 - ti / 700;
      if (alpha <= 0) continue;
      const yy = y + 0.5 * s.accel[n] * ti * ti;
      const xx = x + s.drift[n] * (ti / 1000);
      ctx.globalAlpha = alpha;
      ctx.fillText(glyph, xx, yy);
      // a short trail above it: the "data stream"
      ctx.globalAlpha = alpha * 0.42;
      ctx.fillText(SCRAMBLE[(seed >> 5) % SCRAMBLE.length], xx, yy - l.ch * 0.95);
      ctx.globalAlpha = alpha * 0.2;
      ctx.fillText(SCRAMBLE[(seed >> 9) % SCRAMBLE.length], xx, yy - l.ch * 1.9);
    }
  }
  ctx.globalAlpha = 1;
}
