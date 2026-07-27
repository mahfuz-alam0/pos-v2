"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Delete, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
const MAX_PIN_LENGTH = 8;

// Shared numeric PIN-entry modal used by Clock In/Out and Share Mode — both
// old app flows use the same calculator-style pad (staff often wear gloves
// on the floor, so a real keyboard input isn't reliable at the register).
export default function PinPadModal({ open, title, submitLabel, error, submitting, onSubmit, onClose }) {
  const [pin, setPin] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPin("");
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  function handlePadPress(key) {
    if (key === "⌫") setPin((p) => p.slice(0, -1));
    else if (key !== "") setPin((p) => (p.length >= MAX_PIN_LENGTH ? p : p + key));
    inputRef.current?.focus();
  }

  function handleSubmit() {
    if (!pin || submitting) return;
    onSubmit(pin);
  }

  return (
    <div className="fixed inset-0 z-1050 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-85 rounded-2xl border border-primary/20 bg-accent p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          placeholder="Enter PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, MAX_PIN_LENGTH))}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          maxLength={MAX_PIN_LENGTH}
          className="mb-4 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-center text-2xl tracking-[10px] text-white placeholder:text-sm placeholder:tracking-normal placeholder:text-sidebar-text focus:border-primary/50 focus:outline-none"
          style={{ WebkitTextSecurity: "disc" } as CSSProperties}
        />

        <div className="mb-4 grid grid-cols-3 gap-2.5">
          {PAD_KEYS.map((key, i) => (
            <button
              key={i}
              type="button"
              disabled={key === ""}
              onClick={() => handlePadPress(key)}
              className={cn(
                "flex h-12 items-center justify-center rounded-xl border text-lg font-semibold transition-colors",
                key === ""
                  ? "border-transparent"
                  : key === "⌫"
                    ? "border-red-400/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    : "border-white/15 bg-white/5 text-white hover:bg-white/10 active:scale-95"
              )}
            >
              {key === "⌫" ? <Delete className="size-4.5" /> : key}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!pin || submitting}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-40"
        >
          {submitting ? "Submitting…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
