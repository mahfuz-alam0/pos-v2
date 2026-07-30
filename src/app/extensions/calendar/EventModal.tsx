"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { fetchShopsData } from "@/services/shops/list";
import { listBusinessEntities } from "@/services/businessEntities/list";
import { getSingleCalendar } from "@/services/calendar/getSingle";
import { createCalendar } from "@/services/calendar/create";
import { updateCalendar } from "@/services/calendar/update";
import { removeCalendar } from "@/services/calendar/remove";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import EventDetailsStep from "./EventDetailsStep";
import DateShopStep from "./DateShopStep";
import TimeSlotsStep from "./TimeSlotsStep";
import type { EntityOption, ShopOption } from "./types";
import type { UploadedDoc } from "@/app/admin/inventory/packages/SimpleFileUpload";

export interface EventSlot {
  start: Date;
  end: Date;
  allDay: boolean;
}

export interface TimeSelection {
  date: Date;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
}

type DurationType = "single" | "multiple" | "repeating";

const EMPTY_EVENT_DATA = {
  title: "",
  description: "",
  businessEntityId: null as string | null,
  existingImages: [] as string[],
  files: [] as UploadedDoc[],
};

function formatTwelveHour(date: Date) {
  return format(date, "h:mm a");
}

function formatEvents(events: { date: Date; startTime: Date; endTime: Date }[], isAllDay: boolean) {
  return events.map((event) => ({
    date: format(event.date, "yyyy-MM-dd"),
    fromTimeTwelveHours: isAllDay ? "12:01 AM" : formatTwelveHour(event.startTime),
    toTimeTwelveHours: isAllDay ? "11:59 PM" : formatTwelveHour(event.endTime),
  }));
}

export default function EventModal({
  open,
  onClose,
  eventId,
  initialTime,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string | null;
  initialTime: { start: Date | null; end: Date | null };
}) {
  const isUpdate = !!eventId;

  const [step, setStep] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [errors, setErrors] = useState<{ title?: string | null; description?: string | null; shop?: string | null; date?: string | null }>({});

  const [eventData, setEventData] = useState(EMPTY_EVENT_DATA);
  const [shopIds, setShopIds] = useState<string[]>([]);
  const [durationType, setDurationType] = useState<DurationType>("single");
  const [isAllDay, setIsAllDay] = useState(false);
  const [events, setEvents] = useState<EventSlot[]>([]);
  const [timeSelections, setTimeSelections] = useState<TimeSelection[]>([]);

  const [shops, setShops] = useState<ShopOption[]>([]);
  const [entities, setEntities] = useState<EntityOption[]>([]);

  useEffect(() => {
    fetchShopsData().then((res) => setShops(res.data ?? []));
    listBusinessEntities()
      .then((res) => setEntities(res?.data?.data?.businessEntities ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setErrors({});

    if (isUpdate && eventId) {
      loadEvent(eventId);
      return;
    }

    setEventData(EMPTY_EVENT_DATA);
    setShopIds([]);
    setDurationType("single");
    setTimeSelections([]);

    if (initialTime.start && initialTime.end) {
      setEvents([{ start: initialTime.start, end: initialTime.end, allDay: false }]);
      setIsAllDay(false);
    } else {
      setEvents([]);
      setIsAllDay(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventId]);

  const loadEvent = async (id: string) => {
    setFetching(true);
    try {
      const res = await getSingleCalendar(id);
      const calendar = res?.data?.data?.calendar;
      if (!calendar) throw new Error("Event not found");

      const isSingle = calendar.slots.length === 1;
      const firstSlot = calendar.slots[0];
      const allDay = firstSlot.fromTimeTwelveHours === "12:01 AM" && firstSlot.toTimeTwelveHours === "11:59 PM";

      setEventData({
        title: calendar.title,
        description: calendar.description,
        businessEntityId: calendar.businessEntityId ?? null,
        existingImages: calendar.imageUrls ?? [],
        files: [],
      });
      setShopIds(calendar.tenantIds ?? []);
      setIsAllDay(allDay);
      setDurationType(isSingle ? "single" : "multiple");

      const dayEvents: EventSlot[] = calendar.slots.map((slot: any) => {
        const date = new Date(`${slot.date.split("T")[0]}T00:00:00`);
        return { start: date, end: date, allDay };
      });
      setEvents(dayEvents);

      if (!isSingle) {
        const selections: TimeSelection[] = calendar.slots.map((slot: any) => {
          const dateStr = slot.date.split("T")[0];
          return {
            date: new Date(`${dateStr}T00:00:00`),
            startTime: allDay ? withTime(dateStr, 0, 1) : parseTimeOnDate(dateStr, slot.fromTimeTwelveHours),
            endTime: allDay ? withTime(dateStr, 23, 59) : parseTimeOnDate(dateStr, slot.toTimeTwelveHours),
            isAllDay: allDay,
          };
        });
        setTimeSelections(selections);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load event");
    } finally {
      setFetching(false);
    }
  };

  const generateTimeSelections = (): TimeSelection[] =>
    events.map((event) => ({
      date: event.start,
      startTime: isAllDay ? withTime(format(event.start, "yyyy-MM-dd"), 0, 1) : initialTime.start ?? withTime(format(event.start, "yyyy-MM-dd"), 9, 0),
      endTime: isAllDay ? withTime(format(event.start, "yyyy-MM-dd"), 23, 59) : initialTime.end ?? withTime(format(event.start, "yyyy-MM-dd"), 17, 0),
      isAllDay,
    }));

  const isIndeterminate =
    timeSelections.length > 0 && !timeSelections.every((ts) => ts.isAllDay) && !timeSelections.every((ts) => !ts.isAllDay);

  const clearErrors = () => setErrors({});

  const handleNext = async () => {
    if (step === 0) {
      if (!eventData.title.trim()) return setErrors((p) => ({ ...p, title: "Please enter an event title" }));
      if (!eventData.description.trim()) return setErrors((p) => ({ ...p, description: "Please enter an event description" }));
      clearErrors();
      setStep(1);
      return;
    }

    if (step === 1) {
      if (shopIds.length === 0) return setErrors((p) => ({ ...p, shop: "Please select at least one shop" }));
      if (events.length === 0) {
        return setErrors((p) => ({
          ...p,
          date: durationType === "repeating" ? "Please select days and a date range" : "Please select a date",
        }));
      }
      clearErrors();

      if (durationType !== "single") {
        setTimeSelections(generateTimeSelections());
        setStep(2);
        return;
      }
    }

    await submit();
  };

  const submit = async () => {
    setLoading(true);
    try {
      const slotSource = durationType === "single" ? events : timeSelections;
      const uploaded: string[] = [];
      for (const file of eventData.files) {
        uploaded.push(file.url);
      }
      const imageUrls = [...eventData.existingImages, ...uploaded];

      const payload = {
        tenantIds: shopIds,
        isEnabled: true,
        title: eventData.title,
        description: eventData.description || " ",
        imageUrls,
        isAvailableForSingleDay: true,
        slots: formatEvents(slotSource as any, isAllDay),
        businessEntityId: eventData.businessEntityId || null,
      };

      if (isUpdate && eventId) {
        const res = await updateCalendar({ ...payload, id: eventId });
        if (!res?.data) throw new Error("Failed to update event");
        toast.success("Event updated successfully");
      } else {
        const res = await createCalendar(payload);
        if (!res?.data) throw new Error("Failed to create event");
        toast.success("Event created successfully");
      }
      onClose();
    } catch (err: any) {
      const errors = err?.errors;
      toast.error(Array.isArray(errors) ? errors.join("; ") : err?.message || "Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else onClose();
  };

  const handleDelete = async () => {
    if (!eventId) return;
    setDeleteLoading(true);
    try {
      await removeCalendar(eventId);
      toast.success("Event deleted successfully");
      setDeleteConfirmOpen(false);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete event");
    } finally {
      setDeleteLoading(false);
    }
  };

  const stepTitle = ["Event Details", "Date & Shop Selection", "Time Settings"][step];
  const isLastStep = step === 0 ? false : step === 1 ? durationType === "single" : true;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <span>{isUpdate ? "Update Event" : "Create New Event"} — {stepTitle}</span>
              <span className="flex gap-1.5">
                {[0, 1, 2].map((i) =>
                  i === 2 && durationType === "single" ? null : (
                    <span
                      key={i}
                      className={`size-1.5 rounded-full ${i === step ? "scale-125 bg-blue-500" : i < step ? "bg-green-500" : "bg-muted-foreground/30"}`}
                    />
                  )
                )}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-100">
            {fetching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {step === 0 && (
                  <EventDetailsStep
                    data={eventData}
                    onChange={(patch) => setEventData((prev) => ({ ...prev, ...patch }))}
                    errors={errors}
                    entities={entities}
                  />
                )}
                {step === 1 && (
                  <DateShopStep
                    shopIds={shopIds}
                    onShopIdsChange={setShopIds}
                    shops={shops}
                    isAllDay={isAllDay}
                    onAllDayChange={setIsAllDay}
                    durationType={durationType}
                    onDurationTypeChange={setDurationType}
                    events={events}
                    onEventsChange={setEvents}
                    isUpdate={isUpdate}
                    errors={errors}
                  />
                )}
                {step === 2 && (
                  <TimeSlotsStep
                    isAllDay={isAllDay}
                    onAllDayChange={setIsAllDay}
                    timeSelections={timeSelections}
                    onTimeSelectionsChange={setTimeSelections}
                    isIndeterminate={isIndeterminate}
                  />
                )}
              </>
            )}
          </div>

          <DialogFooter className="border-t-0 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)] sm:justify-between">
            <div>
              {isUpdate && (
                <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)} disabled={loading || fetching}>
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} disabled={loading || fetching}>
                {step > 0 ? "Back" : "Cancel"}
              </Button>
              <Button onClick={handleNext} disabled={loading || fetching}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {isLastStep ? "Save Event" : "Next"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={(v) => !deleteLoading && setDeleteConfirmOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this event? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function withTime(dateStr: string, hours: number, minutes: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function parseTimeOnDate(dateStr: string, timeStr: string) {
  const [time, period] = timeStr.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return withTime(dateStr, h, m);
}
