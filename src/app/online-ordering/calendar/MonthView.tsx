import type { CalendarEventOccurrence } from "./types";

const EVENT_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-orange-500",
];

export function getEventColor(event: CalendarEventOccurrence) {
  const id = event.originalId || event.id;
  if (!id) return EVENT_COLORS[0];
  const colorIndex =
    Math.abs(
      id
        .toString()
        .split("")
        .reduce((a, b) => a + b.charCodeAt(0), 0)
    ) % EVENT_COLORS.length;
  return EVENT_COLORS[colorIndex];
}

function getDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: Date[] = [];

  if (startingDayOfWeek > 0) {
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthDays - i));
    }
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  const remainder = days.length % 7;
  if (remainder !== 0) {
    const daysToAdd = 7 - remainder;
    for (let day = 1; day <= daysToAdd; day++) {
      days.push(new Date(year, month + 1, day));
    }
  }

  return days;
}

function isToday(date: Date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_LANES = 4;

interface Bar {
  event: CalendarEventOccurrence;
  startCol: number; // 0-6, column within the week row
  endCol: number; // 0-6, inclusive
  lane: number;
}

// Groups occurrences sharing originalId into contiguous runs, clips each run to
// the week row, and assigns non-overlapping lanes (greedy interval stacking,
// same approach FullCalendar/Google Calendar use for multi-day event bars).
function layoutWeekRow(weekDays: Date[], events: CalendarEventOccurrence[]): Bar[] {
  const rowKeys = weekDays.map(dateKey);
  const rowStart = rowKeys[0];
  const rowEnd = rowKeys[6];

  const byOriginal = new Map<string, CalendarEventOccurrence[]>();
  for (const event of events) {
    if (event.date < rowStart || event.date > rowEnd) continue;
    const key = event.originalId || event.id;
    if (!byOriginal.has(key)) byOriginal.set(key, []);
    byOriginal.get(key)!.push(event);
  }

  const bars: Omit<Bar, "lane">[] = [];
  for (const occurrences of byOriginal.values()) {
    occurrences.sort((a, b) => a.date.localeCompare(b.date));
    const dates = occurrences.map((o) => o.date);
    bars.push({
      event: occurrences[0],
      startCol: rowKeys.indexOf(dates[0]),
      endCol: rowKeys.indexOf(dates[dates.length - 1]),
    });
  }

  bars.sort((a, b) => a.startCol - b.startCol || b.endCol - a.endCol);

  const laneEnds: number[] = [];
  const laid: Bar[] = [];
  for (const bar of bars) {
    let lane = laneEnds.findIndex((end) => end < bar.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(bar.endCol);
    } else {
      laneEnds[lane] = bar.endCol;
    }
    laid.push({ ...bar, lane });
  }

  return laid;
}

export default function MonthView({
  currentDate,
  events,
  openEventModal,
  setView,
  setCurrentDate,
}: {
  currentDate: Date;
  events: CalendarEventOccurrence[];
  openEventModal: (date?: Date | null, event?: CalendarEventOccurrence | null) => void;
  setView: (v: "month" | "week" | "list") => void;
  setCurrentDate: (d: Date) => void;
}) {
  const days = getDaysInMonth(currentDate);
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="overflow-hidden rounded-lg bg-border">
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((day) => (
          <div key={day} className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {weeks.map((weekDays, weekIndex) => {
        const bars = layoutWeekRow(weekDays, events);
        const laneCount = bars.reduce((max, b) => Math.max(max, b.lane + 1), 0);
        const visibleLanes = Math.min(laneCount, MAX_LANES);
        const overflowByCol = weekDays.map(
          (_, col) => bars.filter((b) => b.lane >= MAX_LANES && b.startCol <= col && b.endCol >= col).length
        );

        return (
          <div key={weekIndex} className="relative grid grid-cols-7 gap-px bg-border">
            {weekDays.map((day, col) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              return (
                <div
                  key={col}
                  className={`min-h-32 cursor-pointer p-1 hover:bg-muted/60 ${isCurrentMonth ? "bg-background" : "bg-muted/30"}`}
                  onClick={() => openEventModal(day)}
                >
                  <div
                    className={`mb-1 text-sm ${
                      isToday(day)
                        ? "flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white"
                        : isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground/60"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div style={{ height: `${visibleLanes * 24}px` }} />
                  {overflowByCol[col] > 0 && (
                    <div
                      className="flex items-center justify-center rounded bg-muted p-1 text-xs font-medium text-muted-foreground hover:bg-muted-foreground/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentDate(new Date(day));
                        setView("week");
                      }}
                      title={`Show all events for ${day.toDateString()}`}
                    >
                      +{overflowByCol[col]} more
                    </div>
                  )}
                </div>
              );
            })}

            <div className="pointer-events-none absolute inset-x-0 top-9 grid grid-cols-7 gap-px px-1">
              {bars
                .filter((bar) => bar.lane < MAX_LANES)
                .map((bar) => (
                  <div
                    key={bar.event.originalId || bar.event.id}
                    className={`${getEventColor(bar.event)} pointer-events-auto mb-1 truncate rounded p-1 text-xs text-white hover:opacity-80`}
                    style={{
                      gridColumn: `${bar.startCol + 1} / ${bar.endCol + 2}`,
                      gridRow: bar.lane + 1,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEventModal(null, bar.event);
                    }}
                    title={bar.event.title}
                  >
                    {bar.event.title}
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
