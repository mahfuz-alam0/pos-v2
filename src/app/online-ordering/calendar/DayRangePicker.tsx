"use client";

import { addDays, differenceInCalendarDays, format, startOfMonth, startOfWeek } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const QUICK_PICKS: { label: string; range: (today: Date) => DateRange }[] = [
  { label: "This week", range: (today) => ({ from: startOfWeek(today), to: addDays(startOfWeek(today), 6) }) },
  { label: "Next 7 days", range: (today) => ({ from: today, to: addDays(today, 6) }) },
  { label: "Next 14 days", range: (today) => ({ from: today, to: addDays(today, 13) }) },
  { label: "This month", range: (today) => ({ from: startOfMonth(today), to: addDays(startOfMonth(addDays(today, 32)), -1) }) },
];

function isSameRange(a: DateRange | undefined, b: DateRange) {
  if (!a?.from || !a?.to) return false;
  return format(a.from, "yyyy-MM-dd") === format(b.from!, "yyyy-MM-dd") && format(a.to, "yyyy-MM-dd") === format(b.to!, "yyyy-MM-dd");
}

// start -> end -> reset+start -> end -> ... A complete range means the next click starts over.
export function nextRange(current: DateRange | undefined, picked: Date): DateRange {
  if (!current?.from || current.to) return { from: picked, to: undefined };
  const [from, to] = picked < current.from ? [picked, current.from] : [current.from, picked];
  return { from, to };
}

export default function DayRangePicker({
  value,
  onChange,
}: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}) {
  const today = new Date();
  const nights = value?.from && value?.to ? differenceInCalendarDays(value.to, value.from) + 1 : 0;

  function handleDayClick(day: Date | undefined) {
    // mode="single" passes undefined when re-clicking the selected day; treat it as picking that day again.
    const picked = day ?? value?.from;
    if (picked) onChange(nextRange(value, picked));
  }

  return (
    <div className="overflow-hidden rounded-xl bg-muted/40 ring-1 ring-foreground/10">
      <div className="flex flex-wrap gap-1.5 p-3 pb-0">
        {QUICK_PICKS.map((qp) => {
          const range = qp.range(today);
          const active = isSameRange(value, range);
          return (
            <button
              key={qp.label}
              type="button"
              onClick={() => onChange(range)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {qp.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-3 pt-3">
        <span className="text-xs font-medium text-muted-foreground">Or pick a custom range</span>
        {nights > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {nights} day{nights !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="overflow-x-auto p-3">
        <Calendar
          mode="single"
          selected={value?.from}
          onSelect={handleDayClick}
          modifiers={{
            range_start: value?.from ?? [],
            range_end: value?.to ?? [],
            range_middle: value?.from && value?.to ? { after: value.from, before: value.to } : [],
          }}
          numberOfMonths={2}
          className="mx-auto w-fit [--cell-size:--spacing(6)]"
          classNames={{ months: "relative flex flex-nowrap justify-center gap-3" }}
          modifiersClassNames={{ range_middle: "[&_button]:bg-primary/15! [&_button]:text-foreground" }}
        />
      </div>

      {value?.from && value?.to && (
        <div className="flex items-center justify-center gap-2 bg-background/60 py-2 text-sm font-medium shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <span>{format(value.from, "MMM d, yyyy")}</span>
          <span className="text-muted-foreground">→</span>
          <span>{format(value.to, "MMM d, yyyy")}</span>
        </div>
      )}
    </div>
  );
}
