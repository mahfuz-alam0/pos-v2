"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { useCurrentUser } from "@/util/use-current-user";
import { createLiveAuditSession } from "@/services/auditSessions/createLiveAuditSession";
import { createAssignedAuditSession } from "@/services/assignedAuditSessions/create";
import { fetchEmployeesList } from "@/services/employees/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/form-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditPackageRow } from "./types";

const COUNT_METHOD_OPTIONS = [
  { value: "SCAN", label: "Scan" },
  { value: "MANUAL", label: "Manual" },
  { value: "EITHER", label: "Either" },
];

interface AddLiveSessionDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedRows: AuditPackageRow[];
  locationId: string;
  locationName?: string;
  onCreated: () => void;
}

// Converts a "HH:mm" (24h) <input type="time"> value into the "hh:mm AM/PM"
// string /assigned-audit-sessions/create expects for dueDateTwelveHours.
function toTwelveHourString(time: string) {
  if (!time) return null;
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  const twelveHour = h % 12 === 0 ? 12 : h % 12;
  return `${String(twelveHour).padStart(2, "0")}:${mStr} ${period}`;
}

// Ported from the "ADD LIVE SESSION" spec. Storage location and packages are
// taken from the page's own filter/selection (shown read-only here, not
// re-picked) — the button that opens this drawer is disabled until a
// location is set on the page itself.
//
// Two entirely different backend calls depending on "Start the session right
// away": checked hits /audit-sessions/create (an immediately-active session
// for the current user — that endpoint has no concept of assignedToId or a
// task, so those fields only make sense, and only render, when unchecked)
// vs. unchecked hits /assigned-audit-sessions/create (a pending session,
// later turned into a real one via /assigned-audit-sessions/start).
export default function AddLiveSessionDrawer({
  open,
  onClose,
  selectedRows,
  locationId,
  locationName,
  onCreated,
}: AddLiveSessionDrawerProps) {
  const router = useRouter();
  const { shopId } = useShop();
  const currentUser = useCurrentUser();

  const [forMe, setForMe] = useState(true);
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [isBlindCount, setIsBlindCount] = useState(false);
  const [countMethod, setCountMethod] = useState("EITHER");
  const [shouldCreateTask, setShouldCreateTask] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [notes, setNotes] = useState("");
  const [startImmediately, setStartImmediately] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForMe(true);
    setEmployeeId("");
    setIsBlindCount(false);
    setCountMethod("EITHER");
    setShouldCreateTask(false);
    setDueDate("");
    setDueTime("");
    setNotes("");
    setStartImmediately(false);
  }, [open]);

  useEffect(() => {
    if (!open || startImmediately || forMe) return;
    setEmployeesLoading(true);
    fetchEmployeesList({ limit: 100 })
      .then((res) => setEmployees(res?.data?.employees ?? res?.data ?? []))
      .finally(() => setEmployeesLoading(false));
  }, [open, startImmediately, forMe]);

  const uniquePackageIds = [...new Set(selectedRows.map((r) => r.id))];

  const handleCreate = async () => {
    if (!locationId) {
      toast.error("Please select a storage location");
      return;
    }

    setCreating(true);

    if (startImmediately) {
      try {
        const res = await createLiveAuditSession({
          shopId: shopId as string,
          packageIds: uniquePackageIds,
          storageLocationId: locationId,
          isBlindCount,
          countMethod: countMethod as "SCAN" | "MANUAL" | "EITHER",
        });
        toast.success("Live count session started!");
        onCreated();
        const createdSession = res?.data?.data?.session || res?.data?.data;
        if (createdSession?.id) {
          router.push(`/inventory-management/audit/${createdSession.id}`);
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to start session");
      } finally {
        setCreating(false);
      }
      return;
    }

    if (!forMe && !employeeId) {
      toast.error("Please select an employee");
      setCreating(false);
      return;
    }
    if (shouldCreateTask && !dueDate) {
      toast.error("Please select a due date for the task");
      setCreating(false);
      return;
    }

    try {
      await createAssignedAuditSession({
        shopId: shopId as string,
        assignedToId: (forMe ? currentUser?.id : employeeId) as string,
        storageLocationId: locationId,
        isBlindCount,
        countMethod: countMethod as "SCAN" | "MANUAL" | "EITHER",
        notes: notes || null,
        shouldCreateTask,
        ...(shouldCreateTask
          ? { dueDateString: dueDate, dueDateTwelveHours: toTwelveHourString(dueTime) }
          : {}),
      });
      toast.success("Live count session created — pending until started");
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Drawer open={open} onClose={creating ? undefined : onClose} side="right" size={520} zIndex={1000}>
      <div className="flex h-full flex-col">
        <div className="border-b p-5">
          <h2 className="text-base font-semibold">Add Live Session</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {locationName || locationId} · {uniquePackageIds.length} package
            {uniquePackageIds.length === 1 ? "" : "s"} selected
          </p>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="flex flex-col gap-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm">
              <Checkbox
                checked={startImmediately}
                onCheckedChange={(c) => setStartImmediately(!!c)}
              />
              <span>
                Start the session right away
                <span className="block text-xs font-normal text-muted-foreground">
                  Unchecked creates a pending session someone starts later from the sessions list.
                </span>
              </span>
            </label>

            {!startImmediately && (
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={forMe} onCheckedChange={(c) => setForMe(!!c)} />
                  For Me
                </label>

                {!forMe && (
                  <Field label="Employee" required>
                    <Select
                      items={employees.map((e) => ({
                        value: e.id,
                        label: `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.name || e.email,
                      }))}
                      value={employeeId}
                      onValueChange={(v) => setEmployeeId(v as string)}
                      disabled={employeesLoading}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {`${e.firstName || ""} ${e.lastName || ""}`.trim() || e.name || e.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={isBlindCount} onCheckedChange={(c) => setIsBlindCount(!!c)} />
              Blind Count
            </label>

            <Field label="How count will happen?">
              <Select
                items={COUNT_METHOD_OPTIONS}
                value={countMethod}
                onValueChange={(v) => setCountMethod(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNT_METHOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {!startImmediately && (
              <div className="flex flex-col gap-3 rounded-lg border p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={shouldCreateTask}
                    onCheckedChange={(c) => setShouldCreateTask(!!c)}
                  />
                  Introduce as task
                </label>

                {shouldCreateTask && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <Field label="Due Date" required className="flex-1">
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
                        />
                      </Field>
                      <Field label="Due Time" className="flex-1">
                        <input
                          type="time"
                          value={dueTime}
                          onChange={(e) => setDueTime(e.target.value)}
                          className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
                        />
                      </Field>
                    </div>
                    <Field label="Notes">
                      <Textarea
                        value={notes}
                        maxLength={200}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes about this task..."
                        rows={3}
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t p-5">
          <Button
            onClick={handleCreate}
            disabled={creating || !locationId}>
            {creating ? "Creating..." : "Create"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
