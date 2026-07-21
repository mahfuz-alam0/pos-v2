"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Single source of truth for available themes. Swatches shown in the
// settings drawer are generated from this list — add a theme here + a
// matching [data-theme="..."] block in src/styles/_themes.scss.
export const THEMES = [
  { id: "style", label: "Navy Blue", primary: "#038FDE", secondary: "#001529" },
  { id: "light_purple", label: "Purple", primary: "#8A2BE2", secondary: "#00B378" },
  { id: "red", label: "Red", primary: "#FF2B7A", secondary: "#00D9C9" },
  { id: "blue", label: "Blue", primary: "#3DA4E6", secondary: "#FCB53B" },
  { id: "dark_blue", label: "Dark Blue", primary: "#0469B9", secondary: "#17BDE5" },
  { id: "orange", label: "Orange", primary: "#F18805", secondary: "#F1D065" },
  { id: "light_blue", label: "Light Blue", primary: "#6A95FF", secondary: "#59DCFF" },
  { id: "deep_orange", label: "Deep Orange", primary: "#F87060", secondary: "#70A288" },
  { id: "light_purple_1", label: "Violet Pink", primary: "#A172E7", secondary: "#E14594" },
  { id: "light_purple_2", label: "Lavender Teal", primary: "#956FE7", secondary: "#64D7D6" },
];

const DEFAULT_THEME = "style";
const STORAGE_KEY = "pos-theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Read synchronously from localStorage on first render so there's no
  // flash-of-default-theme on client nav. SSR still renders DEFAULT_THEME;
  // the inline script in layout.js reconciles the <html> attr before paint.
  const [theme, setThemeState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.some((t) => t.id === stored) ? stored : DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function setTheme(id) {
    if (THEMES.some((t) => t.id === id)) setThemeState(id);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

// Inline, pre-hydration script string — injected via <script
// dangerouslySetInnerHTML> in layout.js so the correct theme attr is set
// before first paint (avoids FOUC / mismatched flash on reload).
export const noFlashThemeScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var valid=${JSON.stringify(THEMES.map((t) => t.id))};if(valid.indexOf(t)===-1)t="${DEFAULT_THEME}";document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;
