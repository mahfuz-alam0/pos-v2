"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = [
  { id: "navy", label: "Navy Blue", primary: "#3DA4E6", secondary: "#001529" },
  { id: "purple", label: "Purple", primary: "#9283D4", secondary: "#00B378" },
];

export const MODES = ["light", "dark"];

const THEME_KEY = "pos-theme";
const MODE_KEY = "pos-mode";
const DEFAULT_THEME = THEMES[0].id;
const DEFAULT_MODE = "light";

// Runs before first paint (injected as inline <script> in layout.js) so
// <html> already has the right data-theme/data-mode before React hydrates.
export const noFlashThemeScript = `
(function () {
  try {
    var theme = localStorage.getItem("${THEME_KEY}") || "${DEFAULT_THEME}";
    var mode = localStorage.getItem("${MODE_KEY}") || "${DEFAULT_MODE}";
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-mode", mode);
  } catch (e) {}
})();
`;

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [mode, setModeState] = useState(DEFAULT_MODE);

  useEffect(() => {
    setThemeState(localStorage.getItem(THEME_KEY) || DEFAULT_THEME);
    setModeState(localStorage.getItem(MODE_KEY) || DEFAULT_MODE);
  }, []);

  const setTheme = (id) => {
    setThemeState(id);
    localStorage.setItem(THEME_KEY, id);
    document.documentElement.setAttribute("data-theme", id);
  };

  const setMode = (m) => {
    setModeState(m);
    localStorage.setItem(MODE_KEY, m);
    document.documentElement.setAttribute("data-mode", m);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, themes: THEMES, mode, setMode, modes: MODES }}
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
