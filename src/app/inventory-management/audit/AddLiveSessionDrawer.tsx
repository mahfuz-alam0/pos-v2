"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { useCurrentUser } from "@/util/use-current-user";
import { createLiveAuditSession } from "@/services/auditSessions/createLiveAuditSession";
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

// Ported from the "ADD LIVE SESSION" spec. Storage location and packages are
// taken from the page's own filter/selection (shown read-only here, not
// re-picked) — the button that opens this drawer is disabled until both are
// set on the page itself.
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
    setNotes("");
    setStartImmediately(false);
  }, [open]);

  useEffect(() => {
    if (!open || forMe) return;
    setEmployeesLoading(true);
    fetchEmployeesList({ limit: 100 })
      .then((res) => setEmployees(res?.data?.employees ?? res?.data ?? []))
      .finally(() => setEmployeesLoading(false));
  }, [open, forMe]);

  const uniquePackageIds = [...new Set(selectedRows.map((r) => r.id))];

  const handleCreate = async () => {
    if (!locationId || uniquePackageIds.length === 0) {
      toast.error("Please select a storage location and at least one package");
      return;
    }
    if (!forMe && !employeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (shouldCreateTask && !dueDate) {
      toast.error("Please select a due date for the task");
      return;
    }

    const assignedToId = forMe ? currentUser?.id : employeeId;

    setCreating(true);
    try {
      const res = await createLiveAuditSession({
        shopId: shopId as string,
        packageIds: uniquePackageIds,
        storageLocationId: locationId,
        assignedToId,
        isBlindCount,
        countMethod,
        shouldCreateTask,
        ...(shouldCreateTask
          ? { dueDate: new Date(dueDate).toISOString(), notes: notes || undefined }
          : {}),
        startImmediately,
      } as any);

      toast.success(
        startImmediately ? "Live count session started!" : "Live count session created",
      );
      onCreated();

      const createdSession = res?.data?.data?.session || res?.data?.data;
      if (startImmediately && createdSession?.id) {
        router.push(`/inventory-management/audit/${createdSession.id}`);
      }
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
                  <Field label="Due Date" required>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
                    />
                  </Field>
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

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={startImmediately}
                onCheckedChange={(c) => setStartImmediately(!!c)}
              />
              Start the session right away
            </label>
          </div>
        </div>

        <div className="flex gap-2 border-t p-5">
          <Button
            onClick={handleCreate}
            disabled={creating || !locationId || uniquePackageIds.length === 0}>
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
