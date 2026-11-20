"use client";

import { useEffect } from "react";
import { applyThemeChoice, readThemeChoice, systemPrefersDark, THEME_STORAGE_KEY } from "../lib/theme";

// Keeps the app's theme in step with the choice (Light / Dark / System):
//  - when the choice is "System" and the device switches between light and dark
//    (sunset, a Control Center toggle), the app follows right away;
//  - when the choice is changed in another browser tab, this tab follows too.
// The first paint is already right (the script in <head>, lib/theme.ts); this
// only handles what happens after. Renders nothing.
export function ThemeSync() {
  useEffect(() => {
    applyThemeChoice(readThemeChoice());

    let media: MediaQueryList | null = null;
    try {
      media = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      media = null;
    }
    const onSystemChange = () => {
      if (readThemeChoice() === "system") applyThemeChoice("system");
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY || e.key === null) applyThemeChoice(readThemeChoice());
    };

    media?.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media?.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}

// (exported only so a test or story can check what "system" means right now)
export const currentSystemPrefersDark = systemPrefersDark;
