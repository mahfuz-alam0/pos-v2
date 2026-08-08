"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, Globe, MessageSquareText, MessageSquareOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getAdminSchedule } from "@/services/chat/getAdminSchedule";
import { updateAdminSchedule } from "@/services/chat/updateAdminSchedule";
import { useCurrentUser } from "@/util/use-current-user";

const DAYS = [
  { key: "monday", label: "Monday", short: "MON" },
  { key: "tuesday", label: "Tuesday", short: "TUE" },
  { key: "wednesday", label: "Wednesday", short: "WED" },
  { key: "thursday", label: "Thursday", short: "THU" },
  { key: "friday", label: "Friday", short: "FRI" },
  { key: "saturday", label: "Saturday", short: "SAT" },
  { key: "sunday", label: "Sunday", short: "SUN" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

interface DaySchedule {
  available: boolean;
  hours: { from: string; to: string };
}

type Schedule = Record<DayKey, DaySchedule>;

const defaultSchedule = (): Schedule =>
  DAYS.reduce((acc, { key }) => {
    acc[key] = { available: true, hours: { from: "09:00", to: "17:00" } };
    return acc;
  }, {} as Schedule);

const TIMEZONES = [
  {
    group: "United States",
    options: [
      { value: "America/New_York", label: "Eastern (New York)" },
      { value: "America/Chicago", label: "Central (Chicago)" },
      { value: "America/Denver", label: "Mountain (Denver)" },
      { value: "America/Phoenix", label: "Mountain (Phoenix, no DST)" },
      { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
      { value: "America/Anchorage", label: "Alaska (Anchorage)" },
      { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
    ],
  },
  {
    group: "Canada",
    options: [
      { value: "America/Toronto", label: "Eastern (Toronto)" },
      { value: "America/Winnipeg", label: "Central (Winnipeg)" },
      { value: "America/Edmonton", label: "Mountain (Edmonton)" },
      { value: "America/Vancouver", label: "Pacific (Vancouver)" },
      { value: "America/St_Johns", label: "Newfoundland (St. John's)" },
      { value: "America/Halifax", label: "Atlantic (Halifax)" },
    ],
  },
];
const TIMEZONE_ITEMS = TIMEZONES.flatMap((g) => g.options);

export default function ChatConfigurationForm() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [is24Hours, setIs24Hours] = useState(false);
  const [timezone, setTimezone] = useState("America/New_York");
  const [withinHoursMessage, setWithinHoursMessage] = useState("Admin will be available shortly.");
  const [withinHoursBuffer, setWithinHoursBuffer] = useState(5);
  const [withinHoursEnabled, setWithinHoursEnabled] = useState(true);
  const [outsideHoursMessage, setOutsideHoursMessage] = useState(
    "Admin is not available at this time. We'll get back to you during our operating hours."
  );
  const [outsideHoursEnabled, setOutsideHoursEnabled] = useState(true);
  const [schedule, setSchedule] = useState<Schedule>(defaultSchedule());

  const userId = useCurrentUser()?.id;

  useEffect(() => {
    if (userId) fetchSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await getAdminSchedule(userId!);
      const data = res?.data;
      if (!data) return;

      setIs24Hours(data.is_24_7);
      setTimezone(data.timezone);
      setWithinHoursMessage(data.within_hours_message);
      setWithinHoursBuffer(data.buffer_time_minutes);
      setWithinHoursEnabled(data.within_hours_enabled);
      setOutsideHoursMessage(data.outside_hours_message);
      setOutsideHoursEnabled(data.outside_hours_enabled);
      if (!data.is_24_7 && data.weekdays) setSchedule(data.weekdays);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleDayChange = (day: DayKey, available: boolean) => {
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], available } }));
  };

  const handleTimeChange = (day: DayKey, field: "from" | "to", value: string) => {
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], hours: { ...prev[day].hours, [field]: value } } }));
  };

  const handleSubmit = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateAdminSchedule(userId, {
        app_id: process.env.NEXT_PUBLIC_CHAT_ID || "app001",
        is_24_7: is24Hours,
        weekdays: is24Hours ? {} : schedule,
        timezone,
        within_hours_message: withinHoursMessage,
        outside_hours_message: outsideHoursMessage,
        buffer_time_minutes: withinHoursBuffer,
        within_hours_enabled: withinHoursEnabled,
        outside_hours_enabled: outsideHoursEnabled,
      });
      toast.success("Schedule updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update schedule");
    } finally {
      setSaving(false);
    }
  };

  const activeDayCount = DAYS.filter((d) => schedule[d.key]?.available).length;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Chat Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Set your live-chat availability and automated replies.
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <CardTitle>Availability</CardTitle>
          </div>
          <CardDescription>Choose when your team is online for chat.</CardDescription>
          <CardAction className="flex items-center gap-3">
            {!is24Hours && (
              <Badge variant="secondary">{activeDayCount}/7 days active</Badge>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Open 24/7</span>
              <Switch checked={is24Hours} onCheckedChange={setIs24Hours} />
            </div>
          </CardAction>
        </CardHeader>

        <CardContent>
          {!is24Hours ? (
            <div className="flex flex-col divide-y divide-foreground/10">
              {DAYS.map(({ key, label, short }) => {
                const day = schedule[key];
                return (
                  <div key={key} className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="flex w-28 items-center gap-3">
                      <Switch
                        checked={day.available}
                        onCheckedChange={(checked) => handleDayChange(key, checked)}
                      />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    {day.available ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          className="w-32"
                          value={day.hours.from}
                          onChange={(e) => handleTimeChange(key, "from", e.target.value)}
                        />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input
                          type="time"
                          className="w-32"
                          value={day.hours.to}
                          onChange={(e) => handleTimeChange(key, "to", e.target.value)}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Closed</span>
                    )}
                    <span className="ml-auto hidden text-xs uppercase text-muted-foreground sm:inline">
                      {short}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
              Chat is available around the clock — no weekly schedule needed.
            </div>
          )}

          <div className="mt-6 max-w-xs">
            <Label className="mb-2 flex items-center gap-1.5 text-muted-foreground">
              <Globe className="size-3.5" />
              Timezone
            </Label>
            <Select items={TIMEZONE_ITEMS} value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((g) => (
                  <SelectGroup key={g.group}>
                    <SelectLabel>{g.group}</SelectLabel>
                    {g.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-4 text-muted-foreground" />
            <CardTitle>Within Chat Hours</CardTitle>
          </div>
          <CardDescription>Auto-reply sent while your team is online.</CardDescription>
          <CardAction className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {withinHoursEnabled ? "Enabled" : "Disabled"}
            </span>
            <Switch checked={withinHoursEnabled} onCheckedChange={setWithinHoursEnabled} />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label className="mb-2 text-muted-foreground">Message</Label>
            <Textarea
              rows={3}
              value={withinHoursMessage}
              onChange={(e) => setWithinHoursMessage(e.target.value)}
              placeholder="Enter message to be sent within chat hours"
            />
          </div>
          <div className="w-48">
            <Label className="mb-2 text-muted-foreground">Buffer time (minutes)</Label>
            <Input
              type="number"
              min={0}
              value={withinHoursBuffer}
              onChange={(e) => setWithinHoursBuffer(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquareOff className="size-4 text-muted-foreground" />
            <CardTitle>Outside Chat Hours</CardTitle>
          </div>
          <CardDescription>Auto-reply sent while your team is offline.</CardDescription>
          <CardAction className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {outsideHoursEnabled ? "Enabled" : "Disabled"}
            </span>
            <Switch checked={outsideHoursEnabled} onCheckedChange={setOutsideHoursEnabled} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <Label className="mb-2 text-muted-foreground">Message</Label>
          <Textarea
            rows={3}
            value={outsideHoursMessage}
            onChange={(e) => setOutsideHoursMessage(e.target.value)}
            placeholder="Enter message to be sent outside chat hours"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end sm:hidden">
        <Button onClick={handleSubmit} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}
