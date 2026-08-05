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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthView({
  currentDate,
  getEventsForDate,
  openEventModal,
  setView,
  setCurrentDate,
}: {
  currentDate: Date;
  getEventsForDate: (date: Date) => CalendarEventOccurrence[];
  openEventModal: (date?: Date | null, event?: CalendarEventOccurrence | null) => void;
  setView: (v: "month" | "week" | "list") => void;
  setCurrentDate: (d: Date) => void;
}) {
  const days = getDaysInMonth(currentDate);

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border">
      {WEEKDAYS.map((day) => (
        <div key={day} className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground">
          {day}
        </div>
      ))}
      {days.map((day, index) => {
        const dayEvents = getEventsForDate(day);
        const isCurrentMonth = day.getMonth() === currentDate.getMonth();

        return (
          <div
            key={index}
            className={`min-h-36 cursor-pointer p-1 hover:bg-muted/60 ${isCurrentMonth ? "bg-background" : "bg-muted/30"}`}
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
            {dayEvents.slice(0, dayEvents.length > 4 ? 3 : 4).map((event) => (
              <div
                key={event.id}
                className={`${getEventColor(event)} mb-1 truncate rounded p-1 text-xs text-white hover:opacity-80`}
                onClick={(e) => {
                  e.stopPropagation();
                  openEventModal(null, event);
                }}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 4 && (
              <div
                className="flex items-center justify-center rounded bg-muted p-1 text-xs font-medium text-muted-foreground hover:bg-muted-foreground/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentDate(new Date(day));
                  setView("week");
                }}
                title={`Show all ${dayEvents.length} events`}
              >
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
