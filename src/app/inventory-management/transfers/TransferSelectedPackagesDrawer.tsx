"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

import { fetchStorageLocations } from "@/services/storageLocations/list";
import { commitWithinLocationTransfer } from "@/services/transfers/commitTransfer";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface TransferPackageRow {
  id: string;
  name?: string;
  advertisedId?: string;
  quantityLeft?: number;
  uoMShortForm?: string;
  storageLocationBreakdown?: Record<string, number>;
}

/**
 * Quick "select packages, then transfer" drawer — matches the old app's
 * within-storage-location transfer flow: unlike add-transfer's full page
 * (which also lets you browse/search for more packages), this only shows
 * whatever was already selected on the calling page, with a remove action
 * per row.
 */
export default function TransferSelectedPackagesDrawer({
  open,
  onClose,
  shopId,
  packages,
  preSelectedSourceId,
  onTransferred,
}: {
  open: boolean;
  onClose: () => void;
  shopId: string;
  packages: TransferPackageRow[];
  preSelectedSourceId?: string | null;
  onTransferred?: () => void;
}) {
  const router = useRouter();
  const [locations, setLocations] = useState<any[]>([]);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<(TransferPackageRow & { displayQuantityToShift: number })[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSourceId(preSelectedSourceId ?? null);
    setDestinationId(null);
    setNotes("");
    setRows(packages.map((p) => ({ ...p, displayQuantityToShift: 1 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !shopId) return;
    fetchStorageLocations(shopId, { limit: 300, page: 1 })
      .then((res) => setLocations(res?.data?.data?.locations ?? []))
      .catch(() => toast.error("Failed to load storage locations"));
  }, [open, shopId]);

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const updateQty = (id: string, value: number) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, displayQuantityToShift: value } : r)));

  const totalQty = (row: TransferPackageRow) =>
    (sourceId ? row.storageLocationBreakdown?.[sourceId] : undefined) ?? row.quantityLeft ?? 0;

  const handleSubmit = async () => {
    if (!sourceId || !destinationId) {
      toast.error("Please select source and destination location first");
      return;
    }
    if (sourceId === destinationId) {
      toast.error("Source and destination storage location cannot be the same");
      return;
    }
    if (rows.length === 0) {
      toast.error("Please select at least one package to complete the transfer");
      return;
    }
    setSubmitting(true);
    try {
      await commitWithinLocationTransfer(shopId, {
        sourceStorageLocationId: sourceId,
        destinationStorageLocationId: destinationId,
        notes,
        items: rows.map((row) => ({ packageId: row.id, displayQuantityToShift: row.displayQuantityToShift })),
      });
      toast.success("Transfer created successfully");
      onTransferred?.();
      onClose();
      router.push("/inventory-management/transfers");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create transfer, please try again!");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onClose={submitting ? undefined : onClose} side="right" size={900}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="text-base font-semibold leading-tight">Transfer Package</div>
          <Button variant="outline" size="icon" onClick={submitting ? undefined : onClose} className="shrink-0">
            <span className="sr-only">Close</span>
            &times;
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-foreground/70">
          <Badge variant="outline" className="w-fit">
            Within Storage Locations
          </Badge>

          <div className="rounded-xl ring-1 ring-foreground/10 bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Transfer Information
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Source Storage <span className="text-destructive">*</span>
                </span>
                <Select
                  items={locations.map((l) => ({ value: l.id, label: l.name }))}
                  value={sourceId ?? undefined}
                  onValueChange={(v) => setSourceId(v as string)}
                >
                  <SelectTrigger className="h-9! w-52">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <span className="mb-2 text-lg text-muted-foreground/60 select-none">→</span>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Destination Storage <span className="text-destructive">*</span>
                </span>
                <Select
                  items={locations.filter((l) => l.id !== sourceId).map((l) => ({ value: l.id, label: l.name }))}
                  value={destinationId ?? undefined}
                  onValueChange={(v) => setDestinationId(v as string)}
                >
                  <SelectTrigger className="h-9! w-52">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations
                      .filter((l) => l.id !== sourceId)
                      .map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Notes</span>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes for this transfer..."
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <div className="flex items-center gap-2 bg-muted/30 px-4 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
              <span className="text-sm font-semibold">Selected Packages</span>
              <Badge variant="secondary">{rows.length} packages</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 border-b-0">
                  <TableHead>Product name</TableHead>
                  <TableHead>Package ID</TableHead>
                  <TableHead className="w-36">Quantity to Shift</TableHead>
                  <TableHead className="w-28">Total Quantity</TableHead>
                  <TableHead className="w-16">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No packages selected.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row, i) => (
                  <TableRow
                    key={row.id}
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                  >
                    <TableCell className="max-w-60 truncate font-medium" title={row.name}>
                      {row.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.advertisedId}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={totalQty(row)}
                        value={row.displayQuantityToShift}
                        onChange={(e) => updateQty(row.id, parseFloat(e.target.value) || 0)}
                        className="h-9 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      {totalQty(row)} {row.uoMShortForm}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRow(row.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button
            className="h-9! rounded! px-3.5! text-[14px]! font-normal!"
            disabled={submitting || rows.length === 0}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="size-3.5 animate-spin" />}
            Create Transfer {rows.length > 0 && `(${rows.length})`}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
