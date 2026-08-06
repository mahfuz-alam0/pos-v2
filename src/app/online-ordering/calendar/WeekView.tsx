import { format } from "date-fns";

import { getEventColor } from "./MonthView";
import type { CalendarEventOccurrence } from "./types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekDays(date: Date) {
  const week: Date[] = [];
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);

  for (let i = 0; i < 7; i++) {
    const weekDay = new Date(startOfWeek);
    weekDay.setDate(startOfWeek.getDate() + i);
    week.push(weekDay);
  }

  return week;
}

function isToday(date: Date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export default function WeekView({
  currentDate,
  getEventsForDate,
  openEventModal,
}: {
  currentDate: Date;
  getEventsForDate: (date: Date) => CalendarEventOccurrence[];
  openEventModal: (date?: Date | null, event?: CalendarEventOccurrence | null) => void;
}) {
  const weekDays = getWeekDays(currentDate);

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border">
      {weekDays.map((day) => {
        const dayEvents = getEventsForDate(day);
        const today = isToday(day);
        return (
          <div key={day.toISOString()} className="bg-background">
            <div className={`p-3 text-center ${today ? "bg-blue-50 font-medium text-blue-600 dark:bg-blue-950" : "text-muted-foreground"}`}>
              <div className="text-sm font-medium">{WEEKDAYS[day.getDay()]}</div>
              <div className="text-lg">{day.getDate()}</div>
            </div>
            <div className="min-h-96 p-2">
              <button
                onClick={() => openEventModal(day)}
                className="mb-2 w-full rounded p-1 text-left text-xs text-muted-foreground hover:bg-muted hover:text-blue-600"
              >
                + Add Event
              </button>
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`${getEventColor(event)} cursor-pointer rounded p-2 text-xs text-white transition-opacity hover:opacity-80`}
                    onClick={() => openEventModal(null, event)}
                  >
                    <div className="mb-1 truncate font-medium">{event.title}</div>
                    <div className="opacity-75">
                      {event.allDay ? "All Day" : `${format(event.start, "HH:mm")} - ${format(event.end, "HH:mm")}`}
                    </div>
                    {event.desc && <div className="mt-1 truncate text-xs opacity-75">{event.desc}</div>}
                  </div>
                ))}
                {dayEvents.length === 0 && <div className="text-xs text-muted-foreground italic">No events</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
