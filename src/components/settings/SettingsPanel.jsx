"use client";

import { useState } from "react";
import { useTheme } from "@/context/theme-context";
import styles from "./SettingsPanel.module.scss";

// Floating gear FAB (fixed, right edge) + the drawer it opens. Drawer holds
// the theme swatch grid — click a swatch to switch theme instantly
// (ThemeProvider persists the choice to localStorage).
export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme, themes } = useTheme();

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        onClick={() => setOpen(true)}
        aria-label="Open theme settings"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <GearIcon />
      </button>

      {open && (
        <div
          className={styles.overlay}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Theme settings"
      >
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>Theme</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <p className={styles.drawerHint}>Pick a color theme for the app.</p>

        <div className={styles.swatchGrid}>
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.swatch} ${theme === t.id ? styles.swatchActive : ""}`}
              onClick={() => setTheme(t.id)}
              aria-pressed={theme === t.id}
              aria-label={t.label}
              title={t.label}
            >
              <span className={styles.swatchColors}>
                <span
                  className={styles.swatchHalf}
                  style={{ background: t.primary }}
                />
                <span
                  className={styles.swatchHalf}
                  style={{ background: t.secondary }}
                />
              </span>
              <span className={styles.swatchLabel}>{t.label}</span>
              {theme === t.id && (
                <span className={styles.swatchCheck} aria-hidden="true">
                  <CheckIcon />
                </span>
              )}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 13.5a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19.4a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4.6a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10.5a1.65 1.65 0 0 0 1-1.51V4.6a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V10.5a1.65 1.65 0 0 0 1.51 1H19.4a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
