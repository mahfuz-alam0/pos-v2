"use client";

import { useState } from "react";
import { useTheme } from "@/context/theme-context";
import Drawer from "@/components/ui/Drawer";

const DRAWER_WIDTH = 320;

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme, themes, mode, setMode, modes } = useTheme();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close settings" : "Open settings"}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex h-11 w-11 items-center justify-center rounded-l-full bg-primary text-on-primary shadow-lg hover:bg-primary-hover transition-transform duration-300 ease-in-out"
        style={{
          transform: `translateY(-50%) translateX(${open ? -DRAWER_WIDTH : 0}px)`,
        }}
      >
        <GearIcon />
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        side="right"
        size={DRAWER_WIDTH}
        className="p-5"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-heading font-semibold text-lg">Settings</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close settings"
            className="text-sidebar-text hover:text-text"
          >
            ✕
          </button>
        </div>

        <section className="mb-6">
          <h3 className="text-sm font-medium text-sidebar-text mb-3">
            Theme
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                title={t.label}
                className={`h-10 w-10 rounded-full ring-offset-2 ring-offset-component-bg ${
                  theme === t.id ? "ring-2 ring-primary" : ""
                }`}
                style={{
                  background: `linear-gradient(135deg, ${t.primary} 50%, ${t.secondary} 50%)`,
                }}
              />
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-sidebar-text mb-3">Mode</h3>
          <div className="flex gap-2">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize ${
                  mode === m
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-text hover:bg-surface-alt"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </section>
      </Drawer>
    </>
  );
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.14.5.6.9 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
