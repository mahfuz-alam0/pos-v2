"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useShop } from "@/context/shop-context";
import { useSettings } from "@/context/settings-context";
import { fetchHardwareClients } from "@/services/hardwareClients/list";
import { removeHardwareClient } from "@/services/hardwareClients/remove";
import {
  getConnectedUserPrintPreference,
  setConnectedUserPrintPreference,
  deleteConnectedUserPrintPreference,
  type ConnectedDeviceProps,
  type ConnectedPrintJobType,
} from "@/services/printClients/connectedUserPrintPreference";
import { JOB_TYPES } from "@/hooks/usePrintClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import LocalDeviceFormDrawer from "./LocalDeviceFormDrawer";

const JOB_TYPE_OPTIONS = Object.values(JOB_TYPES).map((jt) => ({ value: jt, label: jt.replace(/_/g, " ") }));

interface LocalDeviceRow {
  _id: string;
  name: string;
  jobType: string;
  deviceProps?: ConnectedDeviceProps | null;
}

// Two rows a device's deviceProps are considered "the same printer" for —
// good enough to tell which row a saved connected-user-print-preference
// (which stores raw deviceProps, not a device _id) points at.
function deviceMatches(a?: ConnectedDeviceProps | null, b?: ConnectedDeviceProps | null) {
  if (!a || !b) return false;
  return (
    (a.ipAddress ?? null) === (b.ipAddress ?? null) &&
    (a.deviceName ?? null) === (b.deviceName ?? null) &&
    (a.port ?? null) === (b.port ?? null)
  );
}

// List/Delete hit the same confirmed-working endpoints as the
// /settings/hardware-clients admin table (fetchHardwareClients /
// removeHardwareClient) — there's no separate "local" data model on the
// backend today, so Add/Edit here manage the same underlying device records.
// Default preference (Set/Remove Default below) does have its own backend
// model though: /connected-user-print-preference, distinct from the
// /user-print-preference endpoints the Remote tab uses in PrinterDeviceSetup.
export default function LocalDeviceManager() {
  const { shopId } = useShop();
  const { printType, setPrintType } = useSettings();
  const active = printType !== "hardware";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [jobType, setJobType] = useState("");

  const [rows, setRows] = useState<LocalDeviceRow[]>([]);
  const [loading, setLoading] = useState(false);

  // jobType -> current preferred deviceProps for that job type, loaded from
  // /connected-user-print-preference/get-preference. Keyed by jobType (not a
  // device _id — that endpoint has no concept of one) so each row's default
  // state is derived via deviceMatches().
  const [preferredDeviceProps, setPreferredDeviceProps] = useState<Record<string, ConnectedDeviceProps | null>>({});
  const [settingDefaultId, setSettingDefaultId] = useState(null);
  const [removingDefaultJobType, setRemovingDefaultJobType] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadClients = useCallback(async (searchTerm, job) => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (searchTerm) params.search = searchTerm;
      if (job) params.jobType = job;
      const res = await fetchHardwareClients(params);
      setRows(res?.data ?? []);
    } catch (err) {
      toast.error(err?.message || "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients(debouncedSearch, jobType);
  }, [loadClients, debouncedSearch, jobType]);

  // Fetch the current preference for every distinct job type present in the
  // loaded rows, skipping ones already known.
  useEffect(() => {
    if (!shopId || !rows.length) return;
    const jobTypes = [...new Set(rows.map((r) => r.jobType).filter(Boolean))];
    const missing = jobTypes.filter((jt) => !(jt in preferredDeviceProps));
    if (!missing.length) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        missing.map(async (jt) => {
          const res = await getConnectedUserPrintPreference(shopId, jt as ConnectedPrintJobType);
          return [jt, res?.success ? res?.data?.deviceProps ?? null : null] as const;
        })
      );
      if (cancelled) return;
      setPreferredDeviceProps((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();

    return () => {
      cancelled = true;
    };
  }, [shopId, rows, preferredDeviceProps]);

  async function handleSetDefault(row: LocalDeviceRow) {
    setSettingDefaultId(row._id);
    try {
      const deviceProps: ConnectedDeviceProps = {
        ipAddress: row.deviceProps?.ipAddress ?? null,
        deviceName: row.deviceProps?.deviceName ?? row.name ?? null,
        port: row.deviceProps?.port ?? null,
        meta: row.deviceProps?.meta ?? null,
      };
      await setConnectedUserPrintPreference({ shopId, jobType: row.jobType as ConnectedPrintJobType, deviceProps });
      setPreferredDeviceProps((prev) => ({ ...prev, [row.jobType]: deviceProps }));
      toast.success(`${row.name} set as default for ${row.jobType?.replace(/_/g, " ")}`);
    } catch (err) {
      toast.error(err?.message || "Failed to set default device");
    } finally {
      setSettingDefaultId(null);
    }
  }

  async function handleRemoveDefault(row: LocalDeviceRow) {
    setRemovingDefaultJobType(row.jobType);
    try {
      await deleteConnectedUserPrintPreference(shopId, row.jobType as ConnectedPrintJobType);
      setPreferredDeviceProps((prev) => ({ ...prev, [row.jobType]: null }));
      toast.success(`Default removed for ${row.jobType?.replace(/_/g, " ")}`);
    } catch (err) {
      toast.error(err?.message || "Failed to remove default device");
    } finally {
      setRemovingDefaultJobType(null);
    }
  }

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(client) {
    setEditing(client);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeHardwareClient(deleteTarget._id);
      toast.success("Device deleted");
      setDeleteTarget(null);
      loadClients(debouncedSearch, jobType);
    } catch (err) {
      toast.error(err?.message || "Failed to delete device");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <span className="flex items-center gap-2 text-sm text-text">
          <span className={`size-2.5 shrink-0 rounded-full ${active ? "bg-green-500" : "bg-muted-foreground/40"}`} />
          {active ? "Active — this device is the print target" : "Not active"}
        </span>
        {!active && (
          <Button size="sm" variant="outline" onClick={() => setPrintType("browser")}>
            Use This Device
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search devices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={jobType || undefined} onValueChange={setJobType}>
          <SelectTrigger className="w-40 shrink-0">
            <SelectValue placeholder="Job type" />
          </SelectTrigger>
          <SelectContent>
            {JOB_TYPE_OPTIONS.map((job) => (
              <SelectItem key={job.value} value={job.value}>
                {job.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {jobType && (
          <Button variant="ghost" size="sm" onClick={() => setJobType("")}>
            Clear
          </Button>
        )}
        <Button size="sm" onClick={openAdd} className="shrink-0">
          <Plus className="size-4" />
          Add Device
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Job Type</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow className="border-b-0">
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No local devices yet
                </TableCell>
              </TableRow>
            ) : (
              rows.map((client, i) => {
                const isDefault = deviceMatches(client.deviceProps, preferredDeviceProps[client.jobType]);
                return (
                  <TableRow
                    key={client._id}
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                  >
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.jobType?.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      {isDefault ? (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-700">Current</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDefault(client)}
                            disabled={removingDefaultJobType === client.jobType}
                          >
                            {removingDefaultJobType === client.jobType ? "Removing…" : "Remove"}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(client)}
                          disabled={settingDefaultId === client._id}
                        >
                          {settingDefaultId === client._id ? "Setting…" : "Set Default"}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(client)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(client)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <LocalDeviceFormDrawer
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          loadClients(debouncedSearch, jobType);
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to delete <strong>{deleteTarget?.name}</strong>?
            </AlertDialogDescription>
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
    </div>
  );
}
