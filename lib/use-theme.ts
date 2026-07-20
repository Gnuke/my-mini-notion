"use client";

// React hook for the theme toggle. Separated from lib/theme.ts so that the
// server layout can import THEME_INIT_SCRIPT without pulling React hooks
// into the server module graph (Next.js rejects that at build time).

import { useCallback, useState } from "react";
import { applyTheme, DEFAULT_THEME, getInitialTheme, Theme } from "./theme";

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") return DEFAULT_THEME;
    const attr = document.documentElement.getAttribute("data-theme");
    return attr === "light" || attr === "dark" ? attr : getInitialTheme();
  });

  const toggle = useCallback(() => {
    // The <html> attribute is the runtime source of truth (the init script
    // may have set it before hydration), so derive the next mode from it.
    const next: Theme =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "dark"
        : "light";
    applyTheme(next);
    setTheme(next);
  }, []);

  return { theme, toggle };
}
