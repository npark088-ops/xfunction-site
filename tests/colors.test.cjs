// Guards for the color system:
//  1. the contrast script passes (every token pair meets WCAG AA in light and dark);
//  2. the signed-in app doesn't slip back into hard-coded colors: screens must
//     use the tokens in app/app.css so Light, Dark and System all work.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");

test("contrast: every token pair meets WCAG AA in light and dark mode", () => {
  const r = spawnSync(process.execPath, [path.join(root, "scripts", "check-contrast.cjs")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /All pairs meet WCAG AA/);
  const checked = Number((/(\d+) pairs checked/.exec(r.stdout) || [])[1]);
  assert.ok(checked >= 100, `only ${checked} pairs were checked`);
});

// ---- hard-coded color guard -------------------------------------------------

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

// The signed-in app: its screens and the components they use. The public
// marketing pages, the hero, the brand wordmark and the email templates have
// their own palette (marketing.css) and are not covered.
const NOT_APP = /MarketingNav|MarketingFooter|Wordmark|Reveal|FaqList|IconCards|[\\/]hero[\\/]|DroneBackground|LogoIntro|PostHog|onboarding-emails|xf-preview/;
const files = [
  ...walk(path.join(root, "app", "(dashboard)")),
  ...walk(path.join(root, "app", "parent")),
  ...walk(path.join(root, "components")),
].filter((f) => !NOT_APP.test(f));

// A color written directly in a style: white, black, a hex code, or rgb()/hsl().
const HARD_CODED = /(["'`])(white|black)\1|#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

// Places where a literal color is legitimate and why:
//  - the fallback value passed to resolveCssVar() (used only if the token is missing)
//  - the chart helpers that turn a resolved color into rgba(...) with an opacity
const ALLOWED_LINE = /resolveCssVar\(|hexToRgba|return `rgba\(/;

test("the signed-in app uses color tokens, not hard-coded colors", () => {
  assert.ok(files.length > 30, `only ${files.length} files were scanned`);
  const problems = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, "").replace(/\{\/\*.*?\*\/\}/g, "");
      if (HARD_CODED.test(code) && !ALLOWED_LINE.test(code)) {
        problems.push(`${path.relative(root, file)}:${i + 1}: ${line.trim().slice(0, 100)}`);
      }
    });
  }
  assert.deepEqual(problems, [], "Use a token from app/app.css instead of a literal color:\n" + problems.join("\n"));
});

test("the dark palette defines every token the light palette does", () => {
  const css = fs.readFileSync(path.join(root, "app", "app.css"), "utf8").replace(/\r\n/g, "\n");
  const grab = (selector) => {
    const start = css.indexOf(`\n${selector} {`);
    const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("\n}", start)).replace(/\/\*[\s\S]*?\*\//g, "");
    return new Set([...body.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  };
  const light = grab(".xf-app");
  const dark = grab(':root[data-theme="dark"] .xf-app');
  // Tokens that are the same in both modes (type, spacing, radii, shared aliases) need no dark value.
  const sameBothModes = /^--(xf-(font|text|space|radius)|radius|green|red|amber|xf-navy|xf-tint|xf-on-tint|xf-hero-btn|xf-hero-on-btn)/;
  const missing = [...light].filter((t) => !dark.has(t) && !sameBothModes.test(t));
  assert.deepEqual(missing, [], "tokens with no dark value: " + missing.join(", "));
});
