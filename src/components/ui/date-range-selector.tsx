"use client";

import * as React from "react";
import { format, isSameDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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

function addMonths(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

function startOfMonth(d: Date) {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

function endOfMonth(d: Date) {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

const FILTERS = ["Today", "Yesterday", "Last 7 Days", "This Month", "Last Month", "Custom Range"] as const;
type FilterLabel = (typeof FILTERS)[number] | "";

function filterRange(label: FilterLabel): DateRange {
  const today = new Date();
  switch (label) {
    case "Today":
      return { from: startOfDay(today), to: endOfDay(today) };
    case "Yesterday": {
      const y = addDays(today, -1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "Last 7 Days":
      return { from: startOfDay(addDays(today, -6)), to: endOfDay(today) };
    case "This Month":
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case "Last Month": {
      const lastMonth = addMonths(today, -1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    default:
      return { from: startOfDay(today), to: endOfDay(today) };
  }
}

export interface SelectedDateResult {
  startDate: string | null;
  endDate: string | null;
  timeEnabled: boolean;
}

export interface DateRangeSelectorProps {
  setSelectedDate: (result: SelectedDateResult) => void;
  initialDate?: { startDate?: string | Date | null; endDate?: string | Date | null } | null;
  enableTimePicker?: boolean;
  showTimeSwitch?: boolean;
  showAllOption?: boolean;
  availableOptions?: string[] | null;
  singleDateMode?: boolean;
  selectWidth?: number;
  className?: string;
}

function toDateString(d: Date | null) {
  return d ? format(d, "yyyy-MM-dd") : null;
}

export function DateRangeSelector({
  setSelectedDate,
  initialDate = null,
  enableTimePicker = false,
  showTimeSwitch = false,
  showAllOption = true,
  availableOptions = null,
  singleDateMode = false,
  selectWidth = 250,
}: DateRangeSelectorProps) {
  const [selectedFilter, setSelectedFilterState] = React.useState<FilterLabel>("Today");
  const [timePickerEnabled, setTimePickerEnabled] = React.useState(false);
  const [showEndDate, setShowEndDate] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(dateRange);

  React.useEffect(() => {
    if (open) setDraft(undefined);
  }, [open]);

  React.useEffect(() => {
    if (!initialDate) return;
    const start = initialDate.startDate ? new Date(initialDate.startDate) : null;
    const end = initialDate.endDate ? new Date(initialDate.endDate) : null;
    setDateRange({ from: start ?? undefined, to: end ?? undefined });

    if (!start && !end) {
      setSelectedFilterState("");
      return;
    }

    const matched = FILTERS.slice(0, -1).find((label) => {
      const r = filterRange(label);
      return start && end && r.from && r.to && isSameDay(r.from, start) && isSameDay(r.to, end);
    });

    if (matched) {
      setSelectedFilterState(matched);
      return;
    }

    setSelectedFilterState("Custom Range");
    if (singleDateMode && start && end && !isSameDay(start, end)) {
      setShowEndDate(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = (from: Date | null | undefined, to: Date | null | undefined, timeEnabled: boolean) => {
    setSelectedDate({
      startDate: toDateString(from ?? null),
      endDate: toDateString(to ?? null),
      timeEnabled,
    });
  };

  const handleFilterChange = (value: string) => {
    const label = value as FilterLabel;
    setSelectedFilterState(label);
    setShowEndDate(false);

    if (label === "") {
      setDateRange({ from: undefined, to: undefined });
      emit(null, null, false);
      return;
    }

    if (label === "Custom Range") {
      const range = singleDateMode
        ? { from: startOfDay(new Date()), to: endOfDay(new Date()) }
        : dateRange;
      setDateRange(range);
      setDraft(range);
      emit(range.from, range.to, singleDateMode ? false : timePickerEnabled);
      return;
    }

    const range = filterRange(label);
    setDateRange(range);
    emit(range.from, range.to, false);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setDraft(range);
    if (range?.from && range?.to) {
      const newRange = { from: startOfDay(range.from), to: endOfDay(range.to) };
      setDateRange(newRange);
      emit(newRange.from, newRange.to, timePickerEnabled);
      setOpen(false);
    }
  };

  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) return;
    const from = startOfDay(date);
    const to = showEndDate ? dateRange.to : endOfDay(date);
    const newRange = { from, to };
    setDateRange(newRange);
    emit(from, to, timePickerEnabled);
  };

  const handleEndDateToggle = (checked: boolean) => {
    setShowEndDate(checked);
    if (!checked && dateRange.from) {
      const newRange = { from: dateRange.from, to: endOfDay(dateRange.from) };
      setDateRange(newRange);
      emit(newRange.from, newRange.to, timePickerEnabled);
    }
  };

  const isTimePickerEnabled = showTimeSwitch ? timePickerEnabled : enableTimePicker;

  const handleTimeToggle = (checked: boolean) => {
    setTimePickerEnabled(checked);
    if (!checked) {
      const from = dateRange.from ? startOfDay(dateRange.from) : startOfDay(new Date());
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date());
      const resetRange = { from, to };
      setDateRange(resetRange);
      emit(from, to, false);
    } else {
      emit(dateRange.from, dateRange.to, true);
    }
  };

  const options = FILTERS.filter((f) => !availableOptions || availableOptions.includes(f));

  const formatRange = (value: DateRange) => {
    if (!value.from) return null;
    const from = format(value.from, "MMM d, yyyy");
    if (!value.to || isSameDay(value.from, value.to)) return from;
    return `${from} - ${format(value.to, "MMM d, yyyy")}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        items={[
          ...(showAllOption && (!availableOptions || availableOptions.includes("All"))
            ? [{ value: "", label: "All" }]
            : []),
          ...options.map((label) => ({ value: label, label })),
        ]}
        value={selectedFilter}
        onValueChange={handleFilterChange}
      >
        <SelectTrigger style={{ width: selectWidth }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (!availableOptions || availableOptions.includes("All")) && (
            <SelectItem value="">All</SelectItem>
          )}
          {options.map((label) => (
            <SelectItem key={label} value={label}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedFilter === "Custom Range" && !singleDateMode && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
            )}
          >
            <CalendarIcon className="size-4 text-muted-foreground" />
            {formatRange(dateRange) ?? <span className="text-muted-foreground">Select date range</span>}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" min={1} selected={draft} onSelect={handleCalendarSelect} numberOfMonths={2} />
          </PopoverContent>
        </Popover>
      )}

      {selectedFilter === "Custom Range" && singleDateMode && (
        <>
          {!showEndDate ? (
            <DatePicker value={dateRange.from} onChange={handleStartDateChange} className="w-37.5" />
          ) : (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                )}
              >
                <CalendarIcon className="size-4 text-muted-foreground" />
                {formatRange(dateRange) ?? <span className="text-muted-foreground">Select date range</span>}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" min={1} selected={draft} onSelect={handleCalendarSelect} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          )}

          <label className="flex items-center gap-2 whitespace-nowrap text-sm">
            <Checkbox checked={showEndDate} onCheckedChange={(c) => handleEndDateToggle(c === true)} />
            Choose End
          </label>
        </>
      )}

      {showTimeSwitch && selectedFilter === "Custom Range" && !singleDateMode && (
        <div className="flex h-8 items-center gap-2 whitespace-nowrap rounded-lg border border-input bg-muted/40 px-3 text-sm">
          <span className="font-medium text-muted-foreground">Enable Time</span>
          <Switch checked={timePickerEnabled} onCheckedChange={handleTimeToggle} />
        </div>
      )}
    </div>
  );
}
