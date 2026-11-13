// Colours for the 3D scenes. These are the same hues as app/marketing.css
// (blue #2563EB / #7CA6FF, brass #8A6420 / #D9B76E, ink #111A2B / #F3EFE6),
// nudged only where a lit 3D surface needs a slightly different value than a
// flat fill (e.g. the "ink" ribbon is a deep navy so it still catches light on
// a dark background).

export type Theme = "light" | "dark";

export type Palette = {
  /** muted colour for the quiet parts of the surface grid */
  grid: string;
  blue: string;
  brass: string;
  brassGlow: string;
  ribbonBlue: string;
  ribbonInk: string;
  metalFace: string;
  metalEdge: string;
  envIntensity: number;
};

export const PALETTE: Record<Theme, Palette> = {
  light: {
    grid: "#8693AE",
    blue: "#2563EB",
    brass: "#8A6420",
    brassGlow: "#C9983E",
    ribbonBlue: "#2563EB",
    ribbonInk: "#111A2B",
    metalFace: "#C9CFDA",
    metalEdge: "#B8862F",
    envIntensity: 0.95,
  },
  dark: {
    grid: "#5C6C94",
    blue: "#7CA6FF",
    brass: "#D9B76E",
    brassGlow: "#E8CC8C",
    ribbonBlue: "#4A7BF2",
    ribbonInk: "#26376D",
    metalFace: "#AAB4C8",
    metalEdge: "#D9B76E",
    envIntensity: 0.8,
  },
};
