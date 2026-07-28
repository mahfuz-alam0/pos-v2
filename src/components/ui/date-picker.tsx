"use client";

import { CalendarIcon } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  disabledDate?: (date: Date) => boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled,
  className,
  disabledDate,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          className
        )}
        disabled={disabled}
      >
        {value ? value.toLocaleDateString() : <span className="text-muted-foreground">{placeholder}</span>}
        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} disabled={disabledDate} />
      </PopoverContent>
    </Popover>
  );
}
