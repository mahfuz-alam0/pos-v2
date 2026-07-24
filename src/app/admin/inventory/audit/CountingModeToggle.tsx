"use client";

import { cn } from "@/lib/utils";

interface CountingModeToggleProps {
  value: "manual" | "scan";
  onChange: (mode: "manual" | "scan") => void;
}

export default function CountingModeToggle({ value, onChange }: CountingModeToggleProps) {
  return (
    <div className="flex overflow-hidden rounded-lg border">
      {(["manual", "scan"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={cn(
            "px-3 py-1 text-sm capitalize transition-colors",
            value === mode ? "bg-primary text-primary-foreground" : "bg-transparent hover:bg-muted"
          )}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}
