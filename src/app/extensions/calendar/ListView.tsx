import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";

import { getEventColor } from "./MonthView";
import type { CalendarEventOccurrence } from "./types";

export default function ListView({
  calendarEvents,
  openEventModal,
}: {
  calendarEvents: CalendarEventOccurrence[];
  openEventModal: (date?: Date | null, event?: CalendarEventOccurrence | null) => void;
}) {
  const eventGroups: Record<string, CalendarEventOccurrence & { dates: string[] }> = {};
  calendarEvents.forEach((event) => {
    const groupId = event.originalId || event.id;
    if (!eventGroups[groupId]) {
      eventGroups[groupId] = { ...event, dates: [] };
    }
    eventGroups[groupId].dates.push(event.date);
  });

  const sortedGroups = Object.values(eventGroups).sort((a, b) => a.start.getTime() - b.start.getTime());

  if (sortedGroups.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No events scheduled. Click the + button to add your first event!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedGroups.map((group) => {
        const duration = Math.round((group.end.getTime() - group.start.getTime()) / (1000 * 60));
        const isMultiDay = group.dates.length > 1;
        const sortedDates = [...group.dates].sort();

        return (
          <div key={group.originalId || group.id} className="rounded-lg bg-card p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${getEventColor(group)}`} />
                  <h3 className="font-medium">{group.title}</h3>
                  {isMultiDay && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {group.dates.length} days
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="size-4" />
                    {isMultiDay ? (
                      <span>
                        {format(new Date(sortedDates[0]), "MMM d")} - {format(new Date(sortedDates[sortedDates.length - 1]), "MMM d, yyyy")} (
                        {group.dates.length} days)
                      </span>
                    ) : (
                      <span>{format(new Date(sortedDates[0]), "MMM d, yyyy")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4" />
                    {group.allDay ? <span>All Day</span> : <span>{format(group.start, "HH:mm")} ({duration} min)</span>}
                  </div>
                  {group.desc && <div className="mt-2 text-sm">{group.desc}</div>}
                </div>
              </div>
              <button onClick={() => openEventModal(null, group)} className="text-sm text-blue-600 hover:underline">
                Edit
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
