// Resolves a CSS custom property (e.g. "--amber") to its actual
// computed value for the current theme. Needed anywhere a color has
// to be used somewhere that doesn't understand CSS var() syntax —
// Canvas 2D drawing (Chart.js) or hex-plus-alpha-suffix string
// concatenation (e.g. `${color}55` for a translucent shadow), both of
// which need a literal resolved color, not the var() reference itself.
export function resolveCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
