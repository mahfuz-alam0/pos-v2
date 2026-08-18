"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchMetrcAdjustmentReasons } from "@/services/packageReconciliation/metrcAdjustmentReasons";
import { fetchLatestMetrcAdjustmentReasons } from "@/services/packageReconciliation/latestMetrcAdjustmentReasons";
import { reconcileMetrcPackages } from "@/services/packageReconciliation/reconcileMetrcPackages";
import type { MetrcAdjustmentReason, PackageRow } from "@/app/inventory-management/packages/types";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StagedPackage extends PackageRow {
  reason: string;
  reasonId: string;
  notes: string;
  previousNotes?: string;
}

function packageDifference(row: PackageRow) {
  const platformQty = row.quantityLeft ?? 0;
  const metrcQty = row.metrQuantity ?? 0;
  return platformQty - metrcQty;
}

interface BulkReconcileDialogProps {
  open: boolean;
  onClose: () => void;
  packages: PackageRow[];
  onReconciled: () => void;
}

export default function BulkReconcileDialog({ open, onClose, packages, onReconciled }: BulkReconcileDialogProps) {
  const { shopId } = useShop();
  const [staged, setStaged] = useState<StagedPackage[]>([]);
  const [reasons, setReasons] = useState<MetrcAdjustmentReason[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Same reason + notes across a whole sync's worth of packages is the common
  // case; rows stay individually editable afterwards.
  const [bulkApply, setBulkApply] = useState(false);
  const [bulkReasonId, setBulkReasonId] = useState("");
  const [bulkNotes, setBulkNotes] = useState("");

  // Every selected package is listed and submitted, including ones already in sync
  // with METRC (difference 0.00) — that is what the old app does. It filtered its
  // table to non-zero differences, which just rendered "No data" while still
  // submitting all of them; showing the rows is the honest version of that.

  useEffect(() => {
    if (!open) return;
    setStaged(packages.map((p) => ({ ...p, reason: "", reasonId: "", notes: "", previousNotes: "" })));
    setBulkApply(false);
    setBulkReasonId("");
    setBulkNotes("");

    fetchMetrcAdjustmentReasons()
      .then((res) => setReasons(res?.data?.reasons ?? []))
      .catch(() => toast.error("Failed to load adjustment reasons"));

    if (shopId && packages.length > 0) {
      const packagePlatformIds = packages.map((p) => p.id);
      fetchLatestMetrcAdjustmentReasons(shopId as string, packagePlatformIds)
        .then((res) => {
          const byPackageId = new Map((res?.data?.reasons ?? []).map((r: any) => [r.packagePlatformId, r]));
          setStaged((prev) =>
            prev.map((row) => {
              const match: any = byPackageId.get(row.id);
              if (!match) return row;
              return {
                ...row,
                reasonId: match.reasonId ?? "",
                notes: match.additionalNotes ?? "",
                previousNotes: match.additionalNotes ?? "",
              };
            })
          );
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, packages, shopId]);

  const updateStaged = (id: string | number, patch: Partial<StagedPackage>) => {
    setStaged((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const applyToAll = (patch: Partial<StagedPackage>) => {
    setStaged((prev) => prev.map((row) => ({ ...row, ...patch })));
  };

  const canSubmit = staged.length > 0 && staged.every((row) => row.reasonId && row.notes.trim());

  const handleReconcile = async () => {
    if (!shopId) return;
    setSubmitting(true);
    try {
      await reconcileMetrcPackages({
        shopId,
        packages: staged.map((row) => ({
          packagePlatformId: row.id,
          reasonId: row.reasonId,
          notes: row.notes,
          adjustedQuantity: Number(packageDifference(row).toFixed(2)),
        })),
      });
      toast.success("The package reconciliation job has been queued");
      onReconciled();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onClose={submitting ? undefined : onClose} side="right" size="70vw">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="text-base font-semibold leading-tight">Reconcile Packages</div>
          <Button variant="ghost" size="icon" onClick={submitting ? undefined : onClose}>
            <span className="sr-only">Close</span>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">

        {staged.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl p-3 ring-1 ring-foreground/10">
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={bulkApply}
                onCheckedChange={(checked) => setBulkApply(!!checked)}
              />
              Apply the same reason &amp; notes to all packages
            </label>

            {bulkApply && (
              <div className="flex flex-col gap-2">
                <Select
                  items={reasons.map((r) => ({ value: r.platformId, label: r.Name }))}
                  value={bulkReasonId || null}
                  onValueChange={(value) => {
                    const found = reasons.find((r) => r.platformId === value);
                    setBulkReasonId(value as string);
                    applyToAll({ reasonId: value as string, reason: found?.Name ?? "" });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select reason *" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasons.map((r) => (
                      <SelectItem key={r.platformId} value={r.platformId}>
                        {r.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  rows={2}
                  placeholder="Notes *"
                  value={bulkNotes}
                  onChange={(e) => {
                    setBulkNotes(e.target.value);
                    applyToAll({ notes: e.target.value });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Applied to all {staged.length} package{staged.length === 1 ? "" : "s"} below — edit any row to
                  override it individually.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          {staged.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No packages selected.</div>
          ) : (
            <Table>
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow className="bg-muted/60 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                  <TableHead>Package ID</TableHead>
                  <TableHead>Metrc Tag</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-center">Metrc QTY</TableHead>
                  <TableHead className="text-center">Platform QTY</TableHead>
                  <TableHead className="text-center">Difference Count</TableHead>
                  <TableHead className="min-w-48">Reason *</TableHead>
                  <TableHead className="min-w-48">Notes *</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staged.map((row, i) => {
                  const diff = packageDifference(row);
                  return (
                    <TableRow
                      key={row.id}
                      className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                    >
                      <TableCell>{row.advertisedId}</TableCell>
                      <TableCell>{row.metrcTag ?? "-"}</TableCell>
                      <TableCell className="max-w-40 truncate">{row.name ?? "-"}</TableCell>
                      <TableCell className="text-center font-mono">{row.metrQuantity ?? "-"}</TableCell>
                      <TableCell className="text-center font-mono">{row.quantityLeft ?? "-"}</TableCell>
                      <TableCell
                        className={`text-center font-mono font-medium ${diff < 0 ? "text-destructive" : "text-green-600"}`}
                      >
                        {diff.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Select
                          items={reasons.map((r) => ({ value: r.platformId, label: r.Name }))}
                          value={row.reasonId || null}
                          onValueChange={(value) => {
                            const found = reasons.find((r) => r.platformId === value);
                            updateStaged(row.id, { reasonId: value as string, reason: found?.Name ?? "" });
                          }}
                        >
                          <SelectTrigger className="h-9! w-full">
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                          <SelectContent>
                            {reasons.map((r) => (
                              <SelectItem key={r.platformId} value={r.platformId}>
                                {r.Name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Textarea
                          rows={1}
                          className="min-h-9 py-1.5"
                          placeholder="Notes *"
                          value={row.notes}
                          onChange={(e) => updateStaged(row.id, { notes: e.target.value })}
                        />
                        {row.previousNotes && !row.notes && (
                          <div className="mt-1 text-xs text-muted-foreground">Previous: {row.previousNotes}</div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" className="h-9 text-sm" disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          <Button className="h-9 text-sm" disabled={!canSubmit || submitting} onClick={handleReconcile}>
            {submitting ? "Reconciling..." : "Reconcile"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
