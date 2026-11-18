// Drawing for the home-page hero background: slow, layered "waves" in the
// brand palette over a navy gradient, with a soft blue glow and a few drifting
// motes. A PURE function of time — drawHero(ctx, w, h, t) always produces the
// same picture for the same t — so the still frame used for
// prefers-reduced-motion is simply a frame of the same scene.
//
// Palette (brand): navy #092C67, blue #0878EF, light blue #9BCBFF, ice #F2F7FF.
// Two darker/lighter shades of navy (#0B3477 top, #051A40 bottom) give the
// gradient depth; they stay in the navy family.
//
// Legibility: the hero text is white and sits roughly across the middle of the
// hero, over the darkest part of the scene. Every overlay below is
// translucent and capped so that the background behind the text never gets
// lighter than L≈0.18 (white text then keeps >= 4.5:1). The waves live in the
// lower half. A CSS scrim (app/marketing.css, .xf-hero-bg::after) adds a
// further margin, and the measured worst case is checked in the build notes.

export const HERO_COLORS = {
  navyTop: "#0B3477",
  navy: "#092C67",
  navyDeep: "#051A40",
  blue: "#0878EF",
  light: "#9BCBFF",
  ice: "#F2F7FF",
} as const;

// A pleasing, well-composed frame for the still image (seconds into the animation).
export const STILL_TIME = 7.5;

type Layer = {
  base: number; // crest height as a fraction of the hero height
  amp: number; // wave size as a fraction of the hero height
  wl1: number; // wavelengths as fractions of the hero width
  wl2: number;
  w1: number; // angular speeds, rad/s (deliberately slow)
  w2: number;
  p1: number; // phases
  p2: number;
  fillTop: string;
  fillBottom: string;
  line: string;
};

// Back to front. Back layers are paler and move slowest; the front layer is the
// deepest navy and anchors the bottom edge.
const LAYERS: Layer[] = [
  { base: 0.715, amp: 0.04, wl1: 1.1, wl2: 0.55, w1: 0.16, w2: 0.23, p1: 0.4, p2: 1.7,
    fillTop: "rgba(155,203,255,0.20)", fillBottom: "rgba(8,120,239,0.05)", line: "rgba(155,203,255,0.26)" },
  { base: 0.77, amp: 0.043, wl1: 0.95, wl2: 0.48, w1: 0.2, w2: 0.28, p1: 2.1, p2: 0.3,
    fillTop: "rgba(8,120,239,0.30)", fillBottom: "rgba(8,120,239,0.04)", line: "rgba(155,203,255,0.21)" },
  { base: 0.825, amp: 0.045, wl1: 0.85, wl2: 0.42, w1: 0.25, w2: 0.34, p1: 4.0, p2: 2.6,
    fillTop: "rgba(8,120,239,0.34)", fillBottom: "rgba(9,44,103,0.10)", line: "rgba(155,203,255,0.17)" },
  { base: 0.88, amp: 0.043, wl1: 0.75, wl2: 0.38, w1: 0.3, w2: 0.41, p1: 5.3, p2: 1.1,
    fillTop: "rgba(9,44,103,0.66)", fillBottom: "rgba(5,26,64,0.82)", line: "rgba(155,203,255,0.12)" },
  { base: 0.935, amp: 0.038, wl1: 0.65, wl2: 0.33, w1: 0.36, w2: 0.48, p1: 0.9, p2: 3.8,
    fillTop: "rgba(9,44,103,0.86)", fillBottom: "rgba(5,26,64,0.96)", line: "rgba(155,203,255,0.10)" },
];

// ---- motes: positions are derived from t (no state), so draws are repeatable.
type Mote = { x: number; y: number; r: number; vy: number; ph: number; a: number };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOTES: Mote[] = (() => {
  const rnd = mulberry32(20261114);
  return Array.from({ length: 46 }, () => ({
    x: rnd(),
    y: rnd(),
    r: 0.7 + rnd() * 1.5,
    vy: 0.006 + rnd() * 0.012, // fractions of the height per second: a slow drift up
    ph: rnd() * Math.PI * 2,
    a: 0.12 + rnd() * 0.22,
  }));
})();

const STEP = 6; // CSS px between wave points
const ys = new Float32Array(2048);
const TAU = Math.PI * 2;

export function drawHero(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // 1) navy base
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, HERO_COLORS.navyTop);
  bg.addColorStop(0.5, HERO_COLORS.navy);
  bg.addColorStop(1, HERO_COLORS.navyDeep);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 2) soft glows: blue top-right, light blue low-left; both drift very slowly
  const gx = w * (0.78 + 0.04 * Math.sin(t * 0.07));
  const gy = h * (0.12 + 0.03 * Math.sin(t * 0.05 + 1));
  const g1 = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.55);
  g1.addColorStop(0, "rgba(8,120,239,0.34)");
  g1.addColorStop(0.5, "rgba(8,120,239,0.10)");
  g1.addColorStop(1, "rgba(8,120,239,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, h);

  const lx = w * (0.14 + 0.05 * Math.sin(t * 0.06 + 2));
  const ly = h * 0.92;
  const g2 = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(w, h) * 0.4);
  g2.addColorStop(0, "rgba(155,203,255,0.16)");
  g2.addColorStop(1, "rgba(155,203,255,0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);

  // 3) motes
  ctx.fillStyle = HERO_COLORS.light;
  for (const m of MOTES) {
    const y = (((m.y - t * m.vy) % 1) + 1) % 1;
    const x = m.x + Math.sin(t * 0.3 + m.ph) * 0.012;
    ctx.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(t * 0.8 + m.ph));
    ctx.beginPath();
    ctx.arc(x * w, y * h, m.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 4) waves, back to front
  const n = Math.min(ys.length - 2, Math.ceil(w / STEP));
  // On tall, narrow screens (phones) the text block is a larger share of the
  // height, so sit the waves a little lower to keep clear of it.
  const shift = h > w * 1.2 ? 0.04 : 0;
  for (const L of LAYERS) {
    const base = Math.min(0.97, L.base + shift) * h;
    const amp = L.amp * h;
    const k1 = TAU / (L.wl1 * w);
    const k2 = TAU / (L.wl2 * w);
    for (let i = 0; i <= n; i++) {
      const x = i * STEP;
      ys[i] = base + amp * Math.sin(k1 * x + L.w1 * t + L.p1) + amp * 0.5 * Math.sin(k2 * x - L.w2 * t + L.p2);
    }

    const fill = ctx.createLinearGradient(0, base - amp * 1.5, 0, h);
    fill.addColorStop(0, L.fillTop);
    fill.addColorStop(1, L.fillBottom);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, ys[0]);
    for (let i = 1; i <= n; i++) ctx.lineTo(i * STEP, ys[i]);
    ctx.lineTo(n * STEP, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // a fine highlight along the crest
    ctx.strokeStyle = L.line;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, ys[0]);
    for (let i = 1; i <= n; i++) ctx.lineTo(i * STEP, ys[i]);
    ctx.stroke();
  }
}
