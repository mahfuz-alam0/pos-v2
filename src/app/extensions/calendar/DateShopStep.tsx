import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MultiApiSelect } from "@/components/ui/multi-api-select";

import DayRangePicker from "./DayRangePicker";
import type { ShopOption } from "./types";
import type { EventSlot } from "./EventModal";

type DurationType = "single" | "multiple" | "repeating";

const WEEKDAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

function buildDayEvents(start: Date, end: Date, isAllDay: boolean, daysFilter?: number[]) {
  const events: EventSlot[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (current <= endDay) {
    if (!daysFilter || daysFilter.includes(current.getDay())) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current);
      if (isAllDay) {
        slotStart.setHours(0, 1, 0, 0);
        slotEnd.setHours(23, 59, 0, 0);
      } else {
        slotStart.setHours(9, 0, 0, 0);
        slotEnd.setHours(17, 0, 0, 0);
      }
      events.push({ start: slotStart, end: slotEnd, allDay: isAllDay });
    }
    current.setDate(current.getDate() + 1);
  }
  return events;
}

export default function DateShopStep({
  shopIds,
  onShopIdsChange,
  shops,
  isAllDay,
  onAllDayChange,
  durationType,
  onDurationTypeChange,
  events,
  onEventsChange,
  isUpdate,
  errors,
}: {
  shopIds: string[];
  onShopIdsChange: (ids: string[]) => void;
  shops: ShopOption[];
  isAllDay: boolean;
  onAllDayChange: (v: boolean) => void;
  durationType: DurationType;
  onDurationTypeChange: (v: DurationType) => void;
  events: EventSlot[];
  onEventsChange: (events: EventSlot[]) => void;
  isUpdate: boolean;
  errors: { shop?: string | null; date?: string | null };
}) {
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [repeatRange, setRepeatRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [singleDate, setSingleDate] = useState<Date | undefined>(events[0]?.start);
  const [rangeValue, setRangeValue] = useState<DateRange>(
    events.length > 0 ? { from: events[0].start, to: events[events.length - 1].start } : { from: undefined, to: undefined }
  );

  const shopOptions = shops.map((s) => ({ id: s.id, name: s.timeZone ? `${s.name} (${s.timeZone})` : s.name }));

  const handleDurationChange = (value: DurationType) => {
    onDurationTypeChange(value);
    onEventsChange([]);
    if (value !== "repeating") {
      setRepeatDays([]);
      setRepeatRange({ from: undefined, to: undefined });
    }
  };

  const handleSingleDateChange = (date: Date | undefined) => {
    if (!date) return;
    setSingleDate(date);
    const start = new Date(date);
    const end = new Date(date);
    if (isAllDay) {
      start.setHours(0, 1, 0, 0);
      end.setHours(23, 59, 0, 0);
    } else {
      start.setHours(9, 0, 0, 0);
      end.setHours(17, 0, 0, 0);
    }
    onEventsChange([{ start, end, allDay: isAllDay }]);
  };

  const handleRangeChange = (range: DateRange | undefined) => {
    if (!range?.from || !range?.to) return;
    setRangeValue(range);
    onEventsChange(buildDayEvents(range.from, range.to, isAllDay));
  };

  const handleRepeatDayToggle = (day: number) => {
    const next = repeatDays.includes(day) ? repeatDays.filter((d) => d !== day) : [...repeatDays, day];
    setRepeatDays(next);
    if (repeatRange.from && repeatRange.to) {
      onEventsChange(buildDayEvents(repeatRange.from, repeatRange.to, isAllDay, next));
    }
  };

  const handleRepeatRangeChange = (range: DateRange | undefined) => {
    if (!range?.from || !range?.to) return;
    setRepeatRange(range);
    onEventsChange(buildDayEvents(range.from, range.to, isAllDay, repeatDays));
  };

  const handleAllDayChange = (checked: boolean) => {
    onAllDayChange(checked);
    onEventsChange(
      events.map((e) => {
        const start = new Date(e.start);
        const end = new Date(e.start);
        if (checked) {
          start.setHours(0, 1, 0, 0);
          end.setHours(23, 59, 0, 0);
        } else {
          start.setHours(9, 0, 0, 0);
          end.setHours(17, 0, 0, 0);
        }
        return { start, end, allDay: checked };
      })
    );
  };

  return (
    <div className="max-h-125 space-y-6 overflow-y-auto">
      <div className="space-y-1.5">
        <Label>
          Select Shops<span className="ml-1 text-destructive">*</span>
        </Label>
        <MultiApiSelect placeholder="Choose shops for this event" items={shopOptions} value={shopIds} onChange={onShopIdsChange} triggerClassName="w-full" />
        {errors.shop && <p className="text-sm text-destructive">{errors.shop}</p>}
      </div>

      {!isUpdate && (
        <div className="space-y-1.5">
          <Label>Event Duration</Label>
          <div className="flex w-full rounded-lg bg-muted p-0.5">
            {(["single", "multiple", "repeating"] as DurationType[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleDurationChange(opt)}
                className={`flex-1 rounded-[7px] px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                  durationType === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"
                }`}
              >
                {opt === "single" ? "Single Day" : opt === "multiple" ? "Multiple Days" : "Repeating Days"}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={isAllDay} onCheckedChange={(c) => handleAllDayChange(!!c)} className="mt-0.5" />
        <span>
          <span className="font-medium">All Day Event</span>
          <p className="text-xs text-muted-foreground">Toggle this for events that last the entire day</p>
        </span>
      </label>

      <div className="space-y-2">
        <Label>
          Select Date {!isAllDay && "& Time"}
          <span className="ml-1 text-destructive">*</span>
        </Label>

        {durationType === "single" && (
          <div className="space-y-1.5">
            <DatePicker value={singleDate} onChange={handleSingleDateChange} placeholder="Choose your event date" />
            {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
          </div>
        )}

        {durationType === "multiple" && (
          <div className="space-y-1.5">
            <DayRangePicker value={rangeValue} onChange={handleRangeChange} />
            {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
          </div>
        )}

        {durationType === "repeating" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Repeat on these days</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleRepeatDayToggle(day.value)}
                    className={`h-9 w-11 rounded-lg border text-sm font-medium transition-colors ${
                      repeatDays.includes(day.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input text-muted-foreground hover:border-primary/50 hover:text-primary"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date range (start → end)</Label>
              <DateRangePicker value={repeatRange} onChange={handleRepeatRangeChange} placeholder="Select start and end date" />
            </div>

            {events.length > 0 && (
              <p className="text-xs font-medium text-green-600 dark:text-green-500">
                {events.length} occurrence{events.length !== 1 ? "s" : ""} selected
              </p>
            )}

            {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
