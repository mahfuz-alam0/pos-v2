"use client";

import type { DateRange } from "react-day-picker";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

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
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-8 items-center rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30",
          className
        )}
        disabled={disabled}
      >
        {value?.from && value?.to
          ? `${value.from.toLocaleDateString()} - ${value.to.toLocaleDateString()}`
          : <span className="text-muted-foreground">{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={value} onSelect={onChange} />
      </PopoverContent>
    </Popover>
  );
}
