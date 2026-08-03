"use client";

import { useRef } from "react";
import { Barcode } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ScanModeBarProps {
  value: string;
  onChange: (value: string) => void;
  onScan: (value: string) => void;
  scanCounts: Record<string, number>;
  onClear: () => void;
}

export default function ScanModeBar({ value, onChange, onScan, scanCounts, onClear }: ScanModeBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const packageCount = Object.keys(scanCounts).length;
  const totalScanned = Object.values(scanCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-3 mb-3 rounded-[10px] border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 p-3 dark:border-blue-800 dark:from-blue-950/40 dark:to-blue-900/30">
      <div className="flex flex-wrap items-center gap-3">
        <Barcode className="size-6 shrink-0 text-blue-600 dark:text-blue-400" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (val.trim().length >= 5) {
              debounceRef.current = setTimeout(() => onScan(val), 300);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              onScan(value);
            }
          }}
          placeholder="Scan or type Package ID…"
          className="min-w-60 flex-1 border-blue-500 bg-white text-[15px] dark:bg-background"
        />
        {packageCount > 0 ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="whitespace-nowrap rounded-full bg-blue-200 px-3 py-1 text-[13px] font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {packageCount} pkg{packageCount !== 1 ? "s" : ""} · {totalScanned} scanned
            </span>
            <Button variant="destructive" size="sm" onClick={onClear} className="shrink-0">
              Clear
            </Button>
          </div>
        ) : (
          <span className="whitespace-nowrap text-[13px] text-muted-foreground">Ready to scan…</span>
        )}
      </div>
    </div>
  );
}

export function focusScanInput(ref: React.RefObject<HTMLInputElement | null>) {
  setTimeout(() => ref.current?.focus(), 150);
}
