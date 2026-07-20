// Theme preference — dark/light mode core.
//
// The stored value is only honored when it is exactly "light"; everything
// else (missing, corrupted, storage unavailable) falls back to dark, which
// is the product default regardless of the OS color scheme.
//
// Server-safe module (no React imports): the server layout pulls
// THEME_INIT_SCRIPT from here. The useTheme hook lives in lib/use-theme.ts.

export type Theme = "dark" | "light";

export const THEME_KEY = "nook-theme";
export const DEFAULT_THEME: Theme = "dark";

// Inline <head>/<body>-top script: runs synchronously before paint so a
// stored "light" preference never flashes dark first. Must mirror the
// getInitialTheme rule ("light" only; anything else keeps the dark default).
export const THEME_INIT_SCRIPT =
  `try{if(localStorage.getItem("${THEME_KEY}")==="light")` +
  `document.documentElement.setAttribute("data-theme","light")}catch(e){}`;

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage may be full / unavailable */
  }
}
