"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface MetrcTagOption {
  value: string;
  label: string;
}

/**
 * Free-type-or-pick METRC tag field. Ported from the old app's
 * `<AutoComplete allowClear filterOption={...} />` usage — the user can
 * either pick a suggested available tag or type one that isn't in the
 * list at all (the old form never enforced "must match the list").
 * Do not add validation here that blocks typing an arbitrary tag.
 */
export default function MetrcTagCombobox({
  value,
  onChange,
  options,
  placeholder = "Select from dropdown or type manually",
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: MetrcTagOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((opt) => opt.label.toLowerCase().includes(value.toLowerCase()));

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {filtered.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="flex w-full items-center rounded-md px-2 py-1.5 text-left hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
