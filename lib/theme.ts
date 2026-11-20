// Light / Dark / System for the signed-in app.
//
// The student's CHOICE is one of "light", "dark" or "system" (follow the
// device), kept in localStorage under "theme". The RESULT the CSS sees is the
// attribute data-theme="dark" on <html> (and no attribute for light): every dark
// rule in app/app.css, app/globals.css and app/marketing.css hangs off that one
// attribute, so there is a single switch.
//
// No flash: THEME_INIT_SCRIPT is a tiny script placed in <head> (app/layout.tsx)
// that works out the result and sets the attribute BEFORE the first paint.
//
// Scope: the device preference ("system") is followed inside the app only. The
// public marketing pages keep their old behaviour (light unless the student
// explicitly chose dark), so a visitor with a dark phone doesn't suddenly see the
// marketing site change.
//
// No imports: this file is used by the browser, the server and the tests.

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const THEME_CHANGE_EVENT = "xf-theme-change";

// Where "system" applies: the signed-in app. (Same list as the signed-in
// routes in proxy.ts, plus /start.)
export const APP_PATH_PREFIXES = [
  "/app",
  "/today",
  "/overview",
  "/ask",
  "/courses",
  "/compare",
  "/search",
  "/schedule",
  "/trends",
  "/tasks",
  "/grades",
  "/settings",
  "/parent",
  "/connect",
  "/start",
] as const;

export function isAppPath(pathname: string): boolean {
  return APP_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Anything unrecognised (a missing key, an old or hand-edited value) is "system".
export function parseThemeChoice(value: unknown): ThemeChoice {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme {
  if (choice === "dark") return "dark";
  if (choice === "light") return "light";
  return systemPrefersDark ? "dark" : "light";
}

// Runs before first paint (see app/layout.tsx). Plain old JavaScript in a
// string, wrapped in try/catch so it can never break the page: if anything is
// unavailable (private mode, blocked storage) the page simply stays light.
export const THEME_INIT_SCRIPT = `(function(){try{
var root=document.documentElement;
var stored=null;try{stored=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});}catch(e){}
var choice=stored==="light"||stored==="dark"?stored:"system";
var path=location.pathname;
var prefixes=${JSON.stringify(APP_PATH_PREFIXES)};
var inApp=false;
for(var i=0;i<prefixes.length;i++){if(path===prefixes[i]||path.indexOf(prefixes[i]+"/")===0){inApp=true;break;}}
var dark=choice==="dark";
if(choice==="system"&&inApp){try{dark=window.matchMedia("(prefers-color-scheme: dark)").matches;}catch(e){}}
if(dark){root.setAttribute("data-theme","dark");}else{root.removeAttribute("data-theme");}
}catch(e){}})();`;

// ---- browser helpers (call only from client code) -------------------------

export function readThemeChoice(): ThemeChoice {
  try {
    return parseThemeChoice(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

// Puts the right attribute on <html> for a choice and tells anything that
// draws with literal colors (the charts) to redraw. Safe to call repeatedly.
export function applyThemeChoice(choice: ThemeChoice): ResolvedTheme {
  const resolved = resolveTheme(choice, systemPrefersDark());
  const root = document.documentElement;
  if (resolved === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  return resolved;
}

// Remembers a choice (best effort: if storage is blocked it still applies for
// this visit) and applies it.
export function saveThemeChoice(choice: ThemeChoice): ResolvedTheme {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Private browsing / storage disabled: not remembered next visit.
  }
  return applyThemeChoice(choice);
}
