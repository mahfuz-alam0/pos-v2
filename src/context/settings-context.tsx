"use client";

import { createContext, useContext, useState } from "react";

const SettingsContext = createContext(null);

const STORAGE_KEY = "customizeSettings";

const DEFAULTS = {
  labMode: false,
  queueBorder15: false,
  queueBorder20: false,
  queueYellowTime: 15,
  queueRedTime: 20,
  printType: "browser",
  defaultPageSize: 200,
};

const PAGE_SIZE_OPTIONS = [30, 50, 100, 200];

function sanitize(next) {
  const size = Number(next?.defaultPageSize);
  if (!Number.isFinite(size)) return next;
  const valid = PAGE_SIZE_OPTIONS.includes(size);
  return { ...next, defaultPageSize: valid ? size : DEFAULTS.defaultPageSize };
}

function readStored() {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? sanitize({ ...DEFAULTS, ...saved }) : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => readStored());

  function persist(next) {
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function update(patch) {
    persist({ ...settings, ...patch });
  }

  const value = {
    ...settings,
    setLabMode: (v) => update({ labMode: v }),
    setQueueBorder15: (v) => update({ queueBorder15: v }),
    setQueueBorder20: (v) => update({ queueBorder20: v }),
    setQueueYellowTime: (v) => update({ queueYellowTime: v }),
    setQueueRedTime: (v) => update({ queueRedTime: v }),
    setPrintType: (v) => update({ printType: v }),
    setDefaultPageSize: (v) => update({ defaultPageSize: v }),
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
