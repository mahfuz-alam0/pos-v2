"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { createShift } from "@/services/employees/shift/create";
import { editShift } from "@/services/employees/shift/edit";
import { fetchAccessControlledEmployees } from "@/services/employees/listAccessControlled";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";

interface ShiftFormDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  initialShift?: any;
  onClose: () => void;
  onSaved: () => void;
}

function toLocalInputValue(date?: string, time?: string) {
  if (!date) return "";
  const d = new Date(date);
  if (time) {
    const [t, meridiem] = time.split(" ");
    let [h, m] = t.split(":").map(Number);
    if (meridiem === "PM" && h !== 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;
    d.setHours(h, m, 0, 0);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function splitDateTimeLocal(value: string) {
  if (!value) return { date: "", time: "" };
  const d = new Date(value);
  const date = d.toISOString().slice(0, 10);
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return { date, time };
}

export default function ShiftFormDrawer({ open, mode, initialShift, onClose, onSaved }: ShiftFormDrawerProps) {
  const { shopId } = useShop();
  const [isForSelf, setIsForSelf] = useState(true);
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [notes, setNotes] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialShift) {
      setIsForSelf(false);
      setEmployeeId(String(initialShift.employeeId ?? ""));
      setClockIn(toLocalInputValue(initialShift.startDate, initialShift.startTimeTwelveHours));
      setClockOut(toLocalInputValue(initialShift.endDate, initialShift.endTimeTwelveHours));
      setNotes(initialShift.notes ?? "");
      setPin("");
    } else {
      setIsForSelf(true);
      setEmployeeId("");
      setClockIn("");
      setClockOut("");
      setNotes("");
      setPin("");
    }
  }, [open, mode, initialShift]);

  useEffect(() => {
    if (!open || isForSelf) return;
    fetchAccessControlledEmployees(50, 1).then((res) => setEmployees(res?.data?.employees ?? []));
  }, [open, isForSelf]);

  const handleSave = async () => {
    if (!shopId) return;
    if (!isForSelf && !employeeId) return toast.error("Please select an employee");
    if (!clockIn) return toast.error("Please enter clock in time");
    if (!pin.trim()) return toast.error("Please enter your PIN");

    const start = splitDateTimeLocal(clockIn);
    const end = splitDateTimeLocal(clockOut);

    let totalHoursLogged: number | undefined;
    let totalMinutesLogged: number | undefined;
    if (clockIn && clockOut) {
      const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
      const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
      totalHoursLogged = Math.floor(totalMinutes / 60);
      totalMinutesLogged = totalMinutes % 60;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        isForSelf,
        startDate: start.date,
        startTimeTwelveHours: start.time,
        ...(clockOut ? { endDate: end.date, endTimeTwelveHours: end.time, totalHoursLogged, totalMinutesLogged } : {}),
        notes,
        pin,
        shopId,
        ...(!isForSelf ? { employeeId } : {}),
      };

      if (mode === "add") {
        await createShift(body);
        toast.success("Shift created successfully");
      } else {
        await editShift({ ...body, id: initialShift?.id });
        toast.success("Shift updated successfully");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">{mode === "add" ? "Add Shift" : "Edit Shift"}</div>
            <div className="text-xs leading-tight text-muted-foreground">Record clock in / clock out</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            {mode === "add" && (
              <label className="flex items-center justify-between text-sm">
                <span>For myself</span>
                <Switch checked={isForSelf} onCheckedChange={setIsForSelf} />
              </label>
            )}

            {!isForSelf && (
              <Field label="Employee" required>
                <Select
                  items={[{ value: "", label: "Select employee" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]}
                  value={employeeId}
                  onValueChange={(v) => setEmployeeId(v as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field label="Clock In" required>
              <input
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
              />
            </Field>

            <Field label="Clock Out">
              <input
                type="datetime-local"
                value={clockOut}
                min={clockIn || undefined}
                onChange={(e) => setClockOut(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
              />
            </Field>

            <Field label="Notes">
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>

            <Field label="PIN" required>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
