"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = [
  { id: "navy", label: "Navy Blue", primary: "#3DA4E6", secondary: "#001529" },
  { id: "purple", label: "Purple", primary: "#9283D4", secondary: "#00B378" },
];

export const MODES = ["light", "dark", "system"];

const THEME_KEY = "pos-theme";
const MODE_KEY = "pos-mode";
const DEFAULT_THEME = THEMES[0].id;
const DEFAULT_MODE = "system";

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
  } catch (e) {}
})();
`;

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [mode, setModeState] = useState(DEFAULT_MODE);
  const [resolvedMode, setResolvedMode] = useState("light");

  useEffect(() => {
    setThemeState(localStorage.getItem(THEME_KEY) || DEFAULT_THEME);
    const stored = localStorage.getItem(MODE_KEY);
    setModeState(MODES.includes(stored) ? stored : DEFAULT_MODE);
  }, []);

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

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, themes: THEMES, mode, setMode, modes: MODES, resolvedMode }}
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
