"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PlusCircle, XCircle, QrCode as QrCodeIcon } from "lucide-react";
import { QRCode } from "react-qrcode-logo";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { getTimeBasisLoyalty } from "@/services/loyalty/getTimeBasisLoyalty";
import { updateTimeBasisLoyalty } from "@/services/loyalty/updateTimeBasisLoyalty";
import { getLoyaltySettings } from "@/services/loyalty/getLoyaltySettings";
import { getQrCode } from "@/services/loyalty/getQrCode";
import { generateQrCode } from "@/services/loyalty/generateQrCode";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type Day = (typeof DAYS)[number];

const API_DAY: Record<Day, string> = {
  Monday: "MON",
  Tuesday: "TUES",
  Wednesday: "WED",
  Thursday: "THURS",
  Friday: "FRI",
  Saturday: "SAT",
  Sunday: "SUN",
};

interface Slot {
  id: string;
  fromTime: string;
  toTime: string;
  points: number;
}

type SlotsByDay = Record<Day, Slot[]>;

const emptySlots = (): SlotsByDay =>
  DAYS.reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {} as SlotsByDay);

function to24Hour(time12h: string) {
  if (!time12h) return "";
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes] = time.split(":");
  if (hours === "12") hours = "00";
  if (modifier === "PM") hours = String(parseInt(hours, 10) + 12);
  return `${hours.padStart(2, "0")}:${minutes}`;
}

function to12Hour(time24h: string) {
  if (!time24h) return "";
  const [hours, minutes] = time24h.split(":");
  let modifier = "AM";
  let hour = parseInt(hours, 10);
  if (hour >= 12) {
    modifier = "PM";
    if (hour > 12) hour -= 12;
  }
  if (hour === 0) hour = 12;
  return `${String(hour).padStart(2, "0")}:${minutes} ${modifier}`;
}

export default function LoyaltyForm() {
  const [slots, setSlots] = useState<SlotsByDay>(emptySlots());
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loyaltySettings, setLoyaltySettings] = useState<any>(null);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    fetchLoyaltyData();
    getLoyaltySettings().then((res) => setLoyaltySettings(res?.data?.data));
  }, []);

  const fetchLoyaltyData = async () => {
    setLoading(true);
    try {
      const res = await getTimeBasisLoyalty();
      const slotsWrapper = res?.data?.data?.slots;
      if (!slotsWrapper) return;

      setIsEnabled(slotsWrapper.isEnabled);
      const raw = slotsWrapper.slots;

      const formatted = emptySlots();
      (Object.keys(API_DAY) as Day[]).forEach((day) => {
        const apiDay = API_DAY[day];
        const rawSlots = raw[apiDay] || [];
        const filtered = rawSlots.filter(
          (s: any) =>
            !(s.pointsToBeGiven === 0 && s.fromTwelveHours === "12:01 AM" && s.toTwelveHours === "11:59 PM")
        );
        formatted[day] = filtered.map((s: any) => ({
          id: Math.random().toString(36).slice(2, 11),
          fromTime: to24Hour(s.fromTwelveHours),
          toTime: to24Hour(s.toTwelveHours),
          points: s.pointsToBeGiven,
        }));
      });
      setSlots(formatted);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch loyalty data");
    } finally {
      setLoading(false);
    }
  };

  const addSlot = (day: Day) => {
    setSlots((prev) => ({
      ...prev,
      [day]: [...prev[day], { id: Math.random().toString(36).slice(2, 11), fromTime: "", toTime: "", points: 0 }],
    }));
  };

  const removeSlot = (day: Day, id: string) => {
    setSlots((prev) => ({ ...prev, [day]: prev[day].filter((s) => s.id !== id) }));
  };

  const updateSlot = (day: Day, id: string, field: keyof Slot, value: string | number) => {
    setSlots((prev) => ({
      ...prev,
      [day]: prev[day].map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const body: Record<string, any> = {};
      (Object.keys(API_DAY) as Day[]).forEach((day) => {
        const apiDay = API_DAY[day];
        const daySlots = slots[day];
        body[apiDay] = daySlots.length
          ? daySlots.map((s) => ({
              fromTwelveHours: to12Hour(s.fromTime) || "12:01 AM",
              toTwelveHours: to12Hour(s.toTime) || "11:59 PM",
              pointsToBeGiven: s.points || 0,
            }))
          : [{ fromTwelveHours: "12:01 AM", toTwelveHours: "11:59 PM", pointsToBeGiven: 0 }];
      });

      const tenantId = JSON.parse(localStorage.getItem("shopId") || "null");
      await updateTimeBasisLoyalty({ tenantId, slots: body, isEnabled });
      toast.success("Loyalty points updated successfully");
      fetchLoyaltyData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update loyalty points");
    } finally {
      setSaving(false);
    }
  };

  const pointValue = (points: number) => {
    if (!loyaltySettings?.settings) return "Calculating value...";
    const { amountRepresentation, pointsRepresentation } = loyaltySettings.settings;
    return `$${((points || 0) * (amountRepresentation / pointsRepresentation)).toFixed(2)}`;
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Loyalty</h1>
        <Button onClick={() => setQrOpen(true)}>
          <QrCodeIcon className="size-4" />
          QR Code
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {DAYS.map((day) => (
            <div key={day}>
              <div className="mb-2.5 rounded-lg bg-muted px-4 py-3">
                <span className="text-sm font-semibold">{day}</span>
                {slots[day].length === 0 && (
                  <Button variant="link" className="mb-0! mt-1 flex h-auto items-center gap-1 p-0" onClick={() => addSlot(day)}>
                    <PlusCircle className="size-4" />
                    Add time slot
                  </Button>
                )}
              </div>

              {slots[day].map((slot) => (
                <div key={slot.id} className="flex gap-6 border-b border-transparent px-4 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                  <div className="w-32 pt-6">
                    <Button
                      variant="link"
                      className="mb-0! flex h-auto items-center gap-1 p-0 text-destructive"
                      onClick={() => removeSlot(day, slot.id)}
                    >
                      <XCircle className="size-4" />
                      Remove Slot
                    </Button>
                  </div>

                  <div className="flex flex-1 gap-8">
                    <div className="w-48">
                      <label className="mb-2 block text-sm text-muted-foreground">Start Time</label>
                      <Input type="time" value={slot.fromTime} onChange={(e) => updateSlot(day, slot.id, "fromTime", e.target.value)} />
                    </div>
                    <div className="w-48">
                      <label className="mb-2 block text-sm text-muted-foreground">End Time</label>
                      <Input type="time" value={slot.toTime} onChange={(e) => updateSlot(day, slot.id, "toTime", e.target.value)} />
                    </div>
                    <div className="w-60">
                      <label className="mb-2 block text-sm text-muted-foreground">Loyalty Points Given ({pointValue(slot.points)})</label>
                      <Input
                        type="number"
                        min={0}
                        value={slot.points}
                        onChange={(e) => updateSlot(day, slot.id, "points", Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {slots[day].length > 0 && (
                <div className="px-4 py-3">
                  <Button variant="link" className="mb-0! flex h-auto items-center gap-1 p-0" onClick={() => addSlot(day)}>
                    <PlusCircle className="size-4" />
                    Add time slot
                  </Button>
                </div>
              )}
            </div>
          ))}

          <div className="mt-2 ml-4 flex items-center gap-3">
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            <span className="text-sm">Enable</span>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      <QrCodeDialog open={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
}

function QrCodeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchQr = async () => {
    setLoading(true);
    try {
      const res = await getQrCode();
      setQrValue(res?.data?.data?.qrCode ?? null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load QR code");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchQr();
  }, [open]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateQrCode();
      if (res?.data?.success) {
        toast.success("QR Code Generated Successfully");
        await fetchQr();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate QR code");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Loyalty QR Code</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8 text-sm text-muted-foreground">Loading QR Code...</div>
        ) : qrValue ? (
          <>
            <div id="loyalty-qr-print" className="flex flex-col items-center gap-4 py-4">
              <QRCode value={qrValue} qrStyle="dots" size={512} eyeRadius={50} />
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                {generating ? "Generating..." : "Generate New QR Code"}
              </Button>
              <Button onClick={() => window.print()}>Print QR Code</Button>
            </div>
          </>
        ) : (
          <div className="flex justify-center py-8">
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : "Generate QR Code"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
