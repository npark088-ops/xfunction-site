// `npm run check:contrast`: checks the app's color tokens against WCAG AA, in
// BOTH light and dark mode, and exits with an error if any pair fails.
//
// It reads the real values from app/app.css (the `.xf-app` block for light and
// the `:root[data-theme="dark"] .xf-app` block for dark, with the dark values
// laid over the light ones, exactly as the browser does), so it can't drift from
// what ships. Change a color there, run this, and it tells you what broke.
//
// Rules used:
//   text            4.5:1  (WCAG 1.4.3, normal-size text; everything here is treated
//                           as normal size, the stricter choice)
//   UI + graphics   3:1    (WCAG 1.4.11: focus ring, chart lines, form borders,
//                           switches, status icons)
const fs = require("fs");
const path = require("path");

const css = fs.readFileSync(path.join(__dirname, "..", "app", "app.css"), "utf8").replace(/\r\n/g, "\n");

// ---- read a rule's custom properties
function block(selector) {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) throw new Error(`rule not found: ${selector}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`unterminated rule: ${selector}`);
}
function declarations(body) {
  const out = {};
  const clean = body.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of clean.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const light = declarations(block(".xf-app"));
const dark = { ...light, ...declarations(block(':root[data-theme="dark"] .xf-app'))};
const MODES = { light, dark };

// ---- colors
function resolve(vars, value, depth = 0) {
  if (depth > 10) throw new Error("var() loop");
  const m = /^var\((--[\w-]+)\)$/.exec(value);
  return m ? resolve(vars, vars[m[1]] ?? (() => { throw new Error(`unknown token ${m[1]}`); })(), depth + 1) : value;
}
function parse(value) {
  let m = /^#([0-9a-f]{6})$/i.exec(value);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  m = /^#([0-9a-f]{3})$/i.exec(value);
  if (m) return [0, 1, 2].map((i) => parseInt(m[1][i] + m[1][i], 16)).concat(1);
  m = /^rgba?\(([^)]+)\)$/.exec(value);
  if (m) {
    const p = m[1].split(",").map((x) => parseFloat(x));
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  throw new Error(`can't read color: ${value}`);
}
const over = (top, bottom) => {
  const a = top[3];
  return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1);
};
const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// ---- the pairs that matter. [foreground, background, minimum, what it is]
// A token written as "a over b" is a see-through color laid on b.
const TEXT = 4.5;
const UI = 3;
const COURSES = ["--blue", "--green", "--amber", "--course-purple", "--course-teal", "--course-pink"];
const PAIRS = [
  // body text and surfaces
  ["--text", "--bg", TEXT, "Text on the page"],
  ["--text", "--card", TEXT, "Text on a card"],
  ["--text-dim", "--bg", TEXT, "Secondary text on the page"],
  ["--text-dim", "--card", TEXT, "Secondary text on a card"],
  ["--text-dim", "--xf-ice-2", TEXT, "Secondary text on a tinted row"],
  ["--text", "--xf-ice-2", TEXT, "Text on the active menu item"],
  // links
  ["--blue", "--bg", TEXT, "Link text on the page"],
  ["--blue", "--card", TEXT, "Link text on a card"],
  ["--blue", "--xf-ice-2", TEXT, "Link text on a tinted row"],
  ["--blue", "--tint-blue over --card", TEXT, "Link text on an unread notification"],
  ["--text", "--tint-blue over --card", TEXT, "Text on an unread notification"],
  // buttons
  ["--on-btn", "--btn", TEXT, "Button label"],
  ["--on-btn", "--xf-btn-hover", TEXT, "Button label while hovered"],
  ["--on-btn", "--blue", TEXT, "Label on a link-blue button (older screens)"],
  ["--xf-on-tint", "--xf-tint", TEXT, "Chip and tag text"],
  ["--xf-hero-text", "--xf-hero-bg", TEXT, "Text on the Next up card"],
  ["--xf-hero-dim", "--xf-hero-bg", TEXT, "Secondary text on the Next up card"],
  ["--xf-hero-on-btn", "--xf-hero-btn", TEXT, "Button on the Next up card"],
  // status text
  ["--success", "--card", TEXT, "Success text on a card"],
  ["--success", "--bg", TEXT, "Success text on the page"],
  ["--success", "--success-bg", TEXT, "Success text on its tint"],
  ["--warning", "--card", TEXT, "Warning text on a card"],
  ["--warning", "--bg", TEXT, "Warning text on the page"],
  ["--warning", "--warning-bg", TEXT, "Warning text on its tint"],
  ["--danger", "--card", TEXT, "Error text on a card"],
  ["--danger", "--bg", TEXT, "Error text on the page"],
  ["--danger", "--danger-bg", TEXT, "Error text on its tint"],
  ["--xf-warn-text", "--xf-warn-bg", TEXT, "Notice box text"],
  ["--xf-urgent-text", "--xf-urgent-bg", TEXT, "Urgent chip text"],
  ["--on-success-fill", "--success-fill", TEXT, "Text on a solid success badge"],
  ["--on-danger-fill", "--danger-fill", TEXT, "Text on a solid error badge (e.g. the bell count)"],
  // text on course colors (schedule blocks, chips)
  ...COURSES.map((c) => ["--on-course", c, TEXT, `Text on the ${c.replace("--", "")} course color`]),
  // non-text: boundaries, focus, charts, switches, status icons
  ["--accent", "--bg", UI, "Focus ring on the page"],
  ["--accent", "--card", UI, "Focus ring on a card"],
  ["--chart-line", "--card", UI, "Chart line on a card"],
  ["--control-border", "--card", UI, "Form field border on a card"],
  ["--control-border", "--bg", UI, "Form field border on the page"],
  ["--btn", "--card", UI, "Switch / button fill against a card"],
  ["--on-btn", "--btn", UI, "Switch thumb on its filled track"],
  ["--success", "--card", UI, "Success icon"],
  ["--warning", "--card", UI, "Warning icon"],
  ["--danger", "--card", UI, "Error icon"],
  ...COURSES.map((c) => [c, "--card", UI, `Course dot or bar ${c.replace("--", "")} on a card`]),
];

function colorOf(vars, expr, onVars) {
  const parts = expr.split(" over ");
  const top = parse(resolve(vars, vars[parts[0]] ?? (() => { throw new Error(`unknown token ${parts[0]}`); })()));
  if (parts.length === 1) return top[3] < 1 ? over(top, [255, 255, 255, 1]) : top;
  const bottom = colorOf(vars, parts[1]);
  return over(top, bottom);
}

// ---- body background (the area behind the app while overscrolling) must match --bg
const problems = [];
const bodyLight = /body:has\(\.xf-app\)\s*\{\s*background:\s*(#[0-9a-f]{6});/i.exec(css);
const bodyDark = /:root\[data-theme="dark"\] body:has\(\.xf-app\)\s*\{\s*background:\s*(#[0-9a-f]{6});/i.exec(css);
if (!bodyLight || bodyLight[1].toLowerCase() !== light["--bg"].toLowerCase()) problems.push("The light body background no longer matches --bg.");
if (!bodyDark || bodyDark[1].toLowerCase() !== dark["--bg"].toLowerCase()) problems.push("The dark body background no longer matches --bg.");

// ---- run
let checked = 0;
const rows = [];
for (const [mode, vars] of Object.entries(MODES)) {
  for (const [fg, bg, min, label] of PAIRS) {
    let r;
    try {
      r = ratio(colorOf(vars, fg), colorOf(vars, bg));
    } catch (e) {
      problems.push(`${mode}: ${label}: ${e.message}`);
      continue;
    }
    checked++;
    const ok = r >= min;
    rows.push({ mode, label, fg, bg, r, min, ok });
    if (!ok) problems.push(`${mode}: ${label} (${fg} on ${bg}) is ${r.toFixed(2)}:1, needs ${min}:1`);
  }
}

const verbose = process.argv.includes("--all");
for (const row of rows) {
  if (verbose || !row.ok) {
    console.log(`${row.ok ? "pass" : "FAIL"}  ${row.mode.padEnd(5)}  ${row.r.toFixed(2).padStart(5)}:1  (needs ${row.min})  ${row.label}`);
  }
}
console.log(`\n${checked} pairs checked in light and dark mode: ${rows.filter((r) => r.ok).length} pass, ${rows.filter((r) => !r.ok).length} fail.`);
if (problems.length) {
  console.log("\nProblems:");
  for (const p of problems) console.log("  - " + p);
  process.exit(1);
}
console.log("All pairs meet WCAG AA.");
