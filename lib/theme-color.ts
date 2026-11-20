// Resolves a CSS custom property (e.g. "--amber") to its actual
// computed value for the current theme. Needed anywhere a color has
// to be used somewhere that doesn't understand CSS var() syntax —
// Canvas 2D drawing (Chart.js) or hex-plus-alpha-suffix string
// concatenation (e.g. `${color}55` for a translucent shadow), both of
// which need a literal resolved color, not the var() reference itself.
//
// The app's colors are defined on the `.xf-app` wrapper (app/app.css), not on
// <html>, so that wrapper is asked first; <html> is the fallback for pages
// without it. (`.xf-app` has display: contents, which still carries the custom
// properties.) Call it again after a theme change: see lib/use-theme.ts.
export function resolveCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const el = document.querySelector(".xf-app") ?? document.documentElement;
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || fallback;
}
