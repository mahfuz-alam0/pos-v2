"use client";

import { cn } from "@/lib/utils";

interface CountingModeToggleProps {
  value: "manual" | "scan";
  onChange: (mode: "manual" | "scan") => void;
  // When set, only this mode is selectable — the other button is disabled.
  // Used by live count sessions whose countMethod is SCAN or MANUAL (not
  // EITHER), which locks the session to that one counting method.
  lockedTo?: "manual" | "scan" | null;
}

export default function CountingModeToggle({ value, onChange, lockedTo = null }: CountingModeToggleProps) {
  return (
    <div className="flex overflow-hidden rounded-lg bg-muted p-0.5">
      {(["manual", "scan"] as const).map((mode) => {
        const disabled = lockedTo != null && lockedTo !== mode;
        return (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => onChange(mode)}
            title={disabled ? `This session is locked to ${lockedTo} counting.` : undefined}
            className={cn(
              "rounded-[7px] px-3 py-1 text-sm capitalize transition-colors",
              value === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60",
              disabled && "cursor-not-allowed opacity-40 hover:bg-transparent"
            )}
          >
            {mode}
          </button>
        );
      })}
    </div>
  );
}
