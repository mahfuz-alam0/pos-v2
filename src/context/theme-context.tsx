"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = [
  { id: "navy", label: "Navy Blue", primary: "#3DA4E6", secondary: "#001529", accent: "#001529" },
  { id: "purple", label: "Purple", primary: "#9283D4", secondary: "#00B378", accent: "#423B5F" },
  { id: "pink", label: "Pink", primary: "#FF2B7A", secondary: "#00D9C9", accent: "#731337" },
  { id: "sky", label: "Sky", primary: "#3DA4E6", secondary: "#FCB53B", accent: "#1B4A67" },
  { id: "ocean", label: "Ocean", primary: "#0469B9", secondary: "#17BDE5", accent: "#022F53" },
  { id: "gold", label: "Gold", primary: "#F1D065", secondary: "#F18805", accent: "#6C5E2D" },
  { id: "azure", label: "Azure", primary: "#6A95FF", secondary: "#59DCFF", accent: "#304373" },
  { id: "coral", label: "Coral", primary: "#F87060", secondary: "#70A288", accent: "#70322B" },
  { id: "violet", label: "Violet", primary: "#956FE7", secondary: "#64D7D6", accent: "#433268" },
];

export const MODES = ["light", "dark", "system"];

const THEME_KEY = "pos-theme";
const MODE_KEY = "pos-mode";
const CUSTOM_THEME_KEY = "pos-theme-custom";
const CUSTOM_THEME_ID = "custom";
const DEFAULT_THEME = THEMES[0].id;
const DEFAULT_MODE = "system";
export const DEFAULT_CUSTOM_COLORS = { primary: "#3DA4E6", secondary: "#001529", accent: "#001529" };

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function mix(hex, target, amt) {
  const rgb = hexToRgb(hex);
  const c = rgb.map((v, i) => Math.round(v + (target[i] - v) * amt));
  return `#${c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("")}`;
}

const lighten = (hex, amt) => mix(hex, [255, 255, 255], amt);
const darken = (hex, amt) => mix(hex, [0, 0, 0], amt);

// Derives the same hover/active/soft/sidebar variable set the static
// [data-theme] CSS blocks define, so a custom pick behaves identically.
function deriveThemeVars({ primary, secondary, accent }) {
  const [r, g, b] = hexToRgb(primary);
  return {
    "--color-primary": primary,
    "--color-primary-hover": lighten(primary, 0.12),
    "--color-primary-active": darken(primary, 0.12),
    "--color-primary-soft": `rgba(${r}, ${g}, ${b}, 0.16)`,
    "--on-primary": "#ffffff",
    "--color-secondary": secondary,
    "--color-secondary-hover": lighten(secondary, 0.12),
    "--on-secondary": "#ffffff",
    "--color-accent": accent,
    "--sidebar-bg": accent,
    "--sidebar-text": lighten(accent, 0.55),
    "--sidebar-bg-hover": lighten(accent, 0.1),
    "--sidebar-active": lighten(secondary, 0.1),
  };
}

function applyCustomVars(colors) {
  const vars = deriveThemeVars(colors);
  for (const [k, v] of Object.entries(vars)) {
    document.documentElement.style.setProperty(k, v);
  }
}

function clearCustomVars(colors) {
  for (const k of Object.keys(deriveThemeVars(colors))) {
    document.documentElement.style.removeProperty(k);
  }
}

// "system" follows the OS preference; data-mode always gets the resolved
// light/dark value since the CSS only knows those two.
function resolveMode(mode) {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Runs before first paint (injected as inline <script> in layout.js) so
// <html> already has the right data-theme/data-mode before React hydrates.
export const noFlashThemeScript = `
(function () {
  try {
    var theme = localStorage.getItem("${THEME_KEY}") || "${DEFAULT_THEME}";
    var mode = localStorage.getItem("${MODE_KEY}") || "${DEFAULT_MODE}";
    if (mode === "system") {
      mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-mode", mode);
    if (theme === "${CUSTOM_THEME_ID}") {
      var raw = localStorage.getItem("${CUSTOM_THEME_KEY}");
      var c = raw ? JSON.parse(raw) : null;
      if (c) {
        document.documentElement.style.setProperty("--color-primary", c.primary);
        document.documentElement.style.setProperty("--color-secondary", c.secondary);
        document.documentElement.style.setProperty("--color-accent", c.accent);
        document.documentElement.style.setProperty("--sidebar-bg", c.accent);
      }
    }
  } catch (e) {}
})();
`;

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [mode, setModeState] = useState(DEFAULT_MODE);
  const [resolvedMode, setResolvedMode] = useState("light");
  const [customColors, setCustomColorsState] = useState(DEFAULT_CUSTOM_COLORS);

  useEffect(() => {
    setThemeState(localStorage.getItem(THEME_KEY) || DEFAULT_THEME);
    const stored = localStorage.getItem(MODE_KEY);
    setModeState(MODES.includes(stored) ? stored : DEFAULT_MODE);
    const storedCustom = localStorage.getItem(CUSTOM_THEME_KEY);
    if (storedCustom) {
      try {
        setCustomColorsState(JSON.parse(storedCustom));
      } catch {}
    }
  }, []);

  // Keep the derived custom vars in sync whenever the custom theme is active.
  useEffect(() => {
    if (theme !== CUSTOM_THEME_ID) return;
    applyCustomVars(customColors);
    return () => clearCustomVars(customColors);
  }, [theme, customColors]);

  // Keep data-mode in sync with the selection, and follow OS changes live
  // while in system mode.
  useEffect(() => {
    const apply = (m) => {
      document.documentElement.setAttribute("data-mode", m);
      setResolvedMode(m);
    };
    apply(resolveMode(mode));
    if (mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply(mql.matches ? "dark" : "light");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [mode]);

  const setTheme = (id) => {
    setThemeState(id);
    localStorage.setItem(THEME_KEY, id);
    document.documentElement.setAttribute("data-theme", id);
  };

  const setMode = (m) => {
    setModeState(m);
    localStorage.setItem(MODE_KEY, m);
  };

  const setCustomColors = (colors) => {
    setCustomColorsState(colors);
    localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(colors));
    if (theme === CUSTOM_THEME_ID) applyCustomVars(colors);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themes: THEMES,
        mode,
        setMode,
        modes: MODES,
        resolvedMode,
        customColors,
        setCustomColors,
        customThemeId: CUSTOM_THEME_ID,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
