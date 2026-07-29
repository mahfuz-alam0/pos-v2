import { parse } from "date-fns";

import type { CalendarEntry, CalendarEventOccurrence } from "./types";

function parseTwelveHour(dateStr: string, timeStr: string) {
  return parse(`${dateStr} ${timeStr}`, "yyyy-MM-dd h:mm a", new Date());
}

export function calendarsToOccurrences(calendars: CalendarEntry[]): CalendarEventOccurrence[] {
  const events: CalendarEventOccurrence[] = [];

  calendars.forEach((calendar) => {
    if (!calendar.slots?.length) return;

    calendar.slots.forEach((slot) => {
      const rawDate = slot.date.split("T")[0];
      const isAllDay =
        calendar.isAvailableForSingleDay &&
        (slot.fromTimeTwelveHours === "12:00 AM" || slot.fromTimeTwelveHours === "12:01 AM") &&
        (slot.toTimeTwelveHours === "11:59 PM" || slot.toTimeTwelveHours === "12:00 AM");

      let start: Date;
      let end: Date;

      if (isAllDay) {
        start = new Date(`${rawDate}T00:00:00`);
        end = new Date(`${rawDate}T23:59:59`);
      } else {
        start = parseTwelveHour(rawDate, slot.fromTimeTwelveHours);
        end = parseTwelveHour(rawDate, slot.toTimeTwelveHours);
        if (slot.toTimeTwelveHours === "12:00 AM" && slot.fromTimeTwelveHours !== "12:00 AM") {
          end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
        }
      }

      events.push({
        id: `${calendar.id}_${rawDate}`,
        originalId: calendar.id,
        title: calendar.title,
        desc: calendar.description,
        start,
        end,
        allDay: isAllDay,
        imageUrls: calendar.imageUrls,
        isEnabled: calendar.isEnabled,
        date: rawDate,
      });
    });
  });

  return events;
}
