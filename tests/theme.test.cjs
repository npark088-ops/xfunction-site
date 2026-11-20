// Tests for Light / Dark / System (lib/theme.ts), including the tiny script that
// runs in <head> before the first paint (THEME_INIT_SCRIPT). The script is run
// here against a fake browser (a stand-in window, document, localStorage and
// matchMedia) for every combination of saved choice, device setting and page.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const vm = require("node:vm");

const build = process.env.XF_TEST_BUILD;
if (!build) throw new Error("Run these tests with `npm test` (it compiles the TypeScript first).");
const theme = require(path.join(build, "theme.js"));

// Runs the head script in a fake browser and returns what it did to <html>.
function runInitScript({ stored, deviceDark, pathname, storageThrows = false, matchMediaThrows = false }) {
  const attrs = new Map();
  const sandbox = {
    document: {
      documentElement: {
        setAttribute: (k, v) => attrs.set(k, v),
        removeAttribute: (k) => attrs.delete(k),
        getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
      },
    },
    location: { pathname },
    localStorage: {
      getItem: (k) => {
        if (storageThrows) throw new Error("blocked");
        return k === "theme" ? stored ?? null : null;
      },
    },
    window: {
      matchMedia: () => {
        if (matchMediaThrows) throw new Error("no matchMedia");
        return { matches: Boolean(deviceDark) };
      },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(theme.THEME_INIT_SCRIPT, sandbox);
  return attrs.get("data-theme") ?? null;
}

// ----------------------------------------------------------------------------
// the rules
// ----------------------------------------------------------------------------

test("choice: only light and dark are explicit; anything else means System", () => {
  assert.equal(theme.parseThemeChoice("light"), "light");
  assert.equal(theme.parseThemeChoice("dark"), "dark");
  for (const other of ["system", "", "Dark", "auto", null, undefined, 5, {}, "dark "]) {
    assert.equal(theme.parseThemeChoice(other), "system", String(other));
  }
});

test("result: explicit choices win; System follows the device", () => {
  assert.equal(theme.resolveTheme("dark", false), "dark");
  assert.equal(theme.resolveTheme("light", true), "light");
  assert.equal(theme.resolveTheme("system", true), "dark");
  assert.equal(theme.resolveTheme("system", false), "light");
});

test("app pages: the signed-in screens (and their sub-pages) count; the public pages don't", () => {
  for (const p of ["/today", "/overview", "/courses", "/grades/abc", "/settings", "/parent", "/parent/join", "/start", "/schedule", "/trends", "/tasks", "/compare", "/search", "/app"]) {
    assert.equal(theme.isAppPath(p), true, p);
  }
  for (const p of ["/", "/about", "/pricing", "/help", "/changelog", "/login", "/todayish", "/settingsx", "/grade"]) {
    assert.equal(theme.isAppPath(p), false, p);
  }
});

test("the storage key and event names haven't changed (existing saved choices keep working)", () => {
  assert.equal(theme.THEME_STORAGE_KEY, "theme");
  assert.equal(theme.THEME_CHANGE_EVENT, "xf-theme-change");
});

// ----------------------------------------------------------------------------
// the no-flash script
// ----------------------------------------------------------------------------

test("script: nothing saved (the default) follows the device inside the app", () => {
  assert.equal(runInitScript({ stored: null, deviceDark: true, pathname: "/overview" }), "dark");
  assert.equal(runInitScript({ stored: null, deviceDark: false, pathname: "/overview" }), null);
  assert.equal(runInitScript({ stored: "system", deviceDark: true, pathname: "/today" }), "dark");
  assert.equal(runInitScript({ stored: "system", deviceDark: false, pathname: "/today" }), null);
});

test("script: a saved Light or Dark choice beats the device, on every page", () => {
  for (const pathname of ["/overview", "/settings", "/grades/x", "/", "/pricing"]) {
    assert.equal(runInitScript({ stored: "dark", deviceDark: false, pathname }), "dark", `dark on ${pathname}`);
    assert.equal(runInitScript({ stored: "light", deviceDark: true, pathname }), null, `light on ${pathname}`);
  }
});

test("script: the public pages ignore the device (they stay light unless Dark was chosen)", () => {
  for (const pathname of ["/", "/about", "/pricing", "/help", "/changelog", "/login"]) {
    assert.equal(runInitScript({ stored: null, deviceDark: true, pathname }), null, pathname);
    assert.equal(runInitScript({ stored: "system", deviceDark: true, pathname }), null, pathname);
  }
});

test("script: old and odd saved values are treated as System", () => {
  for (const stored of ["", "auto", "DARK", "true", "1", "dark "]) {
    assert.equal(runInitScript({ stored, deviceDark: true, pathname: "/today" }), "dark", `device dark, stored ${JSON.stringify(stored)}`);
    assert.equal(runInitScript({ stored, deviceDark: false, pathname: "/today" }), null, `device light, stored ${JSON.stringify(stored)}`);
  }
});

test("script: it can never break the page (blocked storage, no matchMedia)", () => {
  // Storage blocked: behaves as if nothing was saved.
  assert.equal(runInitScript({ deviceDark: true, pathname: "/today", storageThrows: true }), "dark");
  // matchMedia missing: stays light.
  assert.equal(runInitScript({ stored: "system", pathname: "/today", matchMediaThrows: true }), null);
  assert.doesNotThrow(() => runInitScript({ stored: "dark", pathname: "/today", storageThrows: true, matchMediaThrows: true }));
});

test("script: when it sets nothing, it clears a stale dark attribute", () => {
  const attrs = new Map([["data-theme", "dark"]]);
  const sandbox = {
    document: { documentElement: { setAttribute: (k, v) => attrs.set(k, v), removeAttribute: (k) => attrs.delete(k) } },
    location: { pathname: "/today" },
    localStorage: { getItem: () => "light" },
    window: { matchMedia: () => ({ matches: true }) },
  };
  vm.createContext(sandbox);
  vm.runInContext(theme.THEME_INIT_SCRIPT, sandbox);
  assert.equal(attrs.has("data-theme"), false);
});

test("script: it is plain code that doesn't depend on the app (safe to inline in <head>)", () => {
  assert.ok(theme.THEME_INIT_SCRIPT.length < 1500, `${theme.THEME_INIT_SCRIPT.length} characters`);
  assert.doesNotMatch(theme.THEME_INIT_SCRIPT, /import |require\(|=>/, "no modules, no arrow functions");
  assert.match(theme.THEME_INIT_SCRIPT, /^\(function\(\)\{try\{/);
});
