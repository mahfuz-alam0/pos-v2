"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfMonth(d: Date) {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

function endOfMonth(d: Date) {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function isSameDay(a?: Date, b?: Date) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const PRESETS = [
  {
    label: "Today",
    range: (): DateRange => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
  },
  {
    label: "Yesterday",
    range: (): DateRange => {
      const y = addDays(new Date(), -1);
      return { from: startOfDay(y), to: endOfDay(y) };
    },
  },
  {
    label: "Last 7 Days",
    range: (): DateRange => ({ from: startOfDay(addDays(new Date(), -6)), to: endOfDay(new Date()) }),
  },
  {
    label: "This Month",
    range: (): DateRange => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    label: "Last Month",
    range: (): DateRange => {
      const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    },
  },
] as const;

const CUSTOM = "Custom Range";

function matchPreset(value: DateRange | undefined) {
  if (!value?.from || !value?.to) return CUSTOM;
  const hit = PRESETS.find((p) => {
    const r = p.range();
    return isSameDay(r.from, value.from) && isSameDay(r.to, value.to);
  });
  return hit?.label ?? CUSTOM;
}

function formatRange(value: DateRange | undefined) {
  if (!value?.from) return null;
  const from = value.from.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (!value.to || isSameDay(value.from, value.to)) return from;
  const to = value.to.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${from} - ${to}`;
}

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Select date range",
  disabled,
  className,
}: DateRangePickerProps) {
  const selectedPreset = matchPreset(value);
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(value);

  React.useEffect(() => {
    if (open) setDraft(undefined);
  }, [open]);

  const handlePresetChange = (label: string) => {
    if (label === CUSTOM) {
      setDraft(value);
      setOpen(true);
      return;
    }
    const preset = PRESETS.find((p) => p.label === label);
    if (preset) onChange(preset.range());
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setDraft(range);
    if (range?.from && range?.to) {
      onChange({ from: startOfDay(range.from), to: endOfDay(range.to) });
      setOpen(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select
        items={[...PRESETS.map((p) => ({ value: p.label, label: p.label })), { value: CUSTOM, label: CUSTOM }]}
        value={selectedPreset}
        onValueChange={handlePresetChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.label} value={p.label}>
              {p.label}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM}>{CUSTOM}</SelectItem>
        </SelectContent>
      </Select>

      {selectedPreset === CUSTOM && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="size-4 text-muted-foreground" />
            {formatRange(value) ?? <span className="text-muted-foreground">{placeholder}</span>}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" min={1} selected={draft} onSelect={handleCalendarSelect} numberOfMonths={2} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
