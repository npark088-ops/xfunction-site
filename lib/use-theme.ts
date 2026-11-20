"use client";

import { useSyncExternalStore } from "react";
import { THEME_CHANGE_EVENT, type ResolvedTheme } from "./theme";

// The theme the page is showing right now ("light" or "dark"), updated live.
// Components that draw with literal colors (the Chart.js charts) list it as a
// dependency so they redraw with the new palette when the student switches mode.
function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

const read = (): ResolvedTheme => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, read, () => "light");
}
