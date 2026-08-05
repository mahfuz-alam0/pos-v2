"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { listCalendars } from "@/services/calendar/list";
import { listBusinessEntities } from "@/services/businessEntities/list";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import MonthView from "./MonthView";
import WeekView from "./WeekView";
import ListView from "./ListView";
import EventModal from "./EventModal";
import { calendarsToOccurrences } from "./transform";
import type { CalendarEventOccurrence, EntityOption } from "./types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type ViewMode = "month" | "week" | "list";

function formatDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function CalendarPage() {
  const { shopId } = useShop();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [showModal, setShowModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [initialTime, setInitialTime] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [entityId, setEntityId] = useState<string | null>(null);

  const [events, setEvents] = useState<CalendarEventOccurrence[]>([]);

  useEffect(() => {
    listBusinessEntities()
      .then((res) => setEntities(res?.data?.data?.businessEntities ?? []))
      .catch(() => {});
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const res = await listCalendars(shopId ? String(shopId) : null, entityId);
      const calendars = res?.data?.data?.calendars ?? [];
      setEvents(calendarsToOccurrences(calendars));
    } catch (err: any) {
      toast.error(err?.message || "Failed to load calendar events");
    }
  }, [shopId, entityId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const getEventsForDate = (date: Date) => {
    const dateStr = formatDateKey(date);
    return events.filter((event) => event.date === dateStr);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === "prev" ? -1 : 1));
    setCurrentDate(newDate);
  };

  const navigateYear = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(currentDate.getFullYear() + (direction === "prev" ? -1 : 1));
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === "prev" ? -7 : 7));
    setCurrentDate(newDate);
  };

  const openEventModal = (date: Date | null = null, event: CalendarEventOccurrence | null = null) => {
    if (event) {
      setSelectedEventId(event.originalId || event.id);
      setInitialTime({ start: null, end: null });
    } else {
      setSelectedEventId(null);
      if (date) {
        const start = new Date(date);
        start.setHours(9, 0, 0, 0);
        const end = new Date(date);
        end.setHours(10, 0, 0, 0);
        setInitialTime({ start, end });
      } else {
        setInitialTime({ start: null, end: null });
      }
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEventId(null);
    setInitialTime({ start: null, end: null });
    loadEvents();
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Calendar</h1>

          {view === "month" && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => navigateMonth("prev")}>
                  <ChevronLeft />
                </Button>
                <h2 className="min-w-28 text-center text-lg font-medium">{MONTHS[currentDate.getMonth()]}</h2>
                <Button variant="ghost" size="icon" onClick={() => navigateMonth("next")}>
                  <ChevronRight />
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => navigateYear("prev")}>
                  <ChevronLeft />
                </Button>
                <h2 className="min-w-16 text-center text-lg font-medium">{currentDate.getFullYear()}</h2>
                <Button variant="ghost" size="icon" onClick={() => navigateYear("next")}>
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}

          {view === "week" && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigateWeek("prev")}>
                <ChevronLeft />
              </Button>
              <h2 className="min-w-48 text-center text-lg font-medium">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => navigateWeek("next")}>
                <ChevronRight />
              </Button>
            </div>
          )}

          {view === "list" && <h2 className="text-lg font-medium">All Events</h2>}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-muted p-0.5">
            {(["month", "week", "list"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-[7px] px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <Button onClick={() => openEventModal()}>
            <Plus /> Add Event
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pb-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <span className="text-sm font-medium text-muted-foreground">Business Entity</span>
        <Select
          items={[{ value: "__none__", label: "None" }, ...entities.map((e) => ({ value: e.id, label: e.name }))]}
          value={entityId ?? "__none__"}
          onValueChange={(v) => setEntityId(v === "__none__" ? null : (v as string))}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Business Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {entities.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {view === "month" && (
        <MonthView
          currentDate={currentDate}
          getEventsForDate={getEventsForDate}
          openEventModal={openEventModal}
          setView={setView}
          setCurrentDate={setCurrentDate}
        />
      )}
      {view === "week" && (
        <WeekView currentDate={currentDate} getEventsForDate={getEventsForDate} openEventModal={openEventModal} />
      )}
      {view === "list" && <ListView calendarEvents={events} openEventModal={openEventModal} />}

      <EventModal
        open={showModal}
        onClose={closeModal}
        eventId={selectedEventId}
        initialTime={initialTime}
      />
    </div>
  );
}
