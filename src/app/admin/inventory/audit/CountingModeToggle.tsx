"use client";

import { cn } from "@/lib/utils";

interface CountingModeToggleProps {
  value: "manual" | "scan";
  onChange: (mode: "manual" | "scan") => void;
}

export default function CountingModeToggle({ value, onChange }: CountingModeToggleProps) {
  return (
    <div className="flex overflow-hidden rounded-lg bg-muted p-0.5">
      {(["manual", "scan"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={cn(
            "rounded-[7px] px-3 py-1 text-sm capitalize transition-colors",
            value === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"
          )}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}
