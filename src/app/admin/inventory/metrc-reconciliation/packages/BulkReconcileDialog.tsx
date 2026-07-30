"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchMetrcAdjustmentReasons } from "@/services/packageReconciliation/metrcAdjustmentReasons";
import { fetchLatestMetrcAdjustmentReasons } from "@/services/packageReconciliation/latestMetrcAdjustmentReasons";
import { reconcileMetrcPackages } from "@/services/packageReconciliation/reconcileMetrcPackages";
import type { MetrcAdjustmentReason, PackageRow } from "../../packages/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

  const rowsWithDiff = useMemo(() => staged.filter((row) => packageDifference(row) !== 0), [staged]);

  useEffect(() => {
    if (!open) return;
    setStaged(packages.map((p) => ({ ...p, reason: "", reasonId: "", notes: "", previousNotes: "" })));

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

  const canSubmit = rowsWithDiff.length > 0 && rowsWithDiff.every((row) => row.reasonId && row.notes.trim());

  const handleReconcile = async () => {
    if (!shopId) return;
    setSubmitting(true);
    try {
      await reconcileMetrcPackages({
        shopId,
        packages: rowsWithDiff.map((row) => ({
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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Reconcile Packages in Metrc</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {rowsWithDiff.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              None of the selected packages have a quantity difference from Metrc.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package ID</TableHead>
                  <TableHead>Metrc Tag</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-center">Metrc Qty</TableHead>
                  <TableHead className="text-center">Platform Qty</TableHead>
                  <TableHead className="text-center">Difference</TableHead>
                  <TableHead className="min-w-48">Reason *</TableHead>
                  <TableHead className="min-w-48">Notes *</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsWithDiff.map((row) => {
                  const diff = packageDifference(row);
                  return (
                    <TableRow key={row.id}>
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
                          value={row.reasonId || undefined}
                          onValueChange={(value) => {
                            const found = reasons.find((r) => r.platformId === value);
                            updateStaged(row.id, { reasonId: value as string, reason: found?.Name ?? "" });
                          }}
                        >
                          <SelectTrigger className="w-full">
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSubmit || submitting} onClick={handleReconcile}>
            {submitting ? "Reconciling..." : "Reconcile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
