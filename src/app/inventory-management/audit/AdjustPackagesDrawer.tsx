"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { XCircle } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchMetrcAdjustmentReasons, createMetrcBulkPackageAdjustments } from "@/services/metrc/adjustmentReasons";
import { createPackageAdjustment } from "@/services/packageAdjustments/create";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdjustmentReason, PendingAdjustment } from "./types";

interface AdjustPackagesDrawerProps {
  open: boolean;
  onClose: () => void;
  validAdjustments: PendingAdjustment[];
  onRemove: (key: string) => void;
  onCompleted: () => void;
}

export default function AdjustPackagesDrawer({
  open,
  onClose,
  validAdjustments,
  onRemove,
  onCompleted,
}: AdjustPackagesDrawerProps) {
  const { shopId } = useShop();
  const [adjustmentReasons, setAdjustmentReasons] = useState<AdjustmentReason[]>([]);
  const [selectedReason, setSelectedReason] = useState<string | undefined>(undefined);
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [reportToMetrc, setReportToMetrc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({ active: false, current: 0, total: 0 });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    fetchMetrcAdjustmentReasons(shopId)
      .then((res) => setAdjustmentReasons(res?.data?.reasons ?? []))
      .catch(() => toast.error("Failed to load METRC adjustment reasons"));
  }, [open, shopId]);

  const adjustmentKey = (adj: PendingAdjustment) =>
    adj.locationId ? `${adj.id}-${adj.locationId}` : String(adj.id);

  const handleComplete = async () => {
    if (!selectedReason || !adjustmentNotes) {
      toast.warning("Please provide an adjustment reason and notes.");
      return;
    }

    setIsSubmitting(true);
    try {
      const groupedAdjustments: Record<
        string,
        {
          shopId: any;
          additionalNotes: string;
          initiationReason: string;
          packageId: string;
          storageLocationBreakdown: { storageLocationId: string; differenceCount: number }[];
          shouldApproveRightAway: boolean;
          initiationReasonReferenceId: null;
          originSessionId: null;
          id: string;
          advertisedId?: string;
          totalDifference: number;
        }
      > = {};

      validAdjustments.forEach((adj) => {
        if (!groupedAdjustments[adj.id]) {
          groupedAdjustments[adj.id] = {
            shopId,
            additionalNotes: adjustmentNotes,
            initiationReason: selectedReason,
            packageId: adj.id,
            storageLocationBreakdown: [],
            shouldApproveRightAway: true,
            initiationReasonReferenceId: null,
            originSessionId: null,
            id: adj.id,
            advertisedId: adj.advertisedId,
            totalDifference: 0,
          };
        }

        const diff = adj.newQty - adj.originalQty;
        groupedAdjustments[adj.id].totalDifference += diff;

        let targetLocationId = adj.locationId || undefined;
        if (!targetLocationId) {
          const breakdownKeys = Object.keys(adj.record.storageLocationBreakdown || {});
          if (breakdownKeys.length > 0) targetLocationId = breakdownKeys[0];
        }

        if (targetLocationId) {
          const existingLoc = groupedAdjustments[adj.id].storageLocationBreakdown.find(
            (s) => s.storageLocationId === targetLocationId
          );
          if (existingLoc) existingLoc.differenceCount += diff;
          else groupedAdjustments[adj.id].storageLocationBreakdown.push({ storageLocationId: targetLocationId, differenceCount: diff });
        }
      });

      const adjustmentList = Object.values(groupedAdjustments)
        .map((d) => ({
          ...d,
          storageLocationBreakdown: d.storageLocationBreakdown.filter((loc) => loc.differenceCount !== 0),
        }))
        .filter((d) => d.totalDifference !== 0 && d.storageLocationBreakdown.length > 0);

      const skippedCount = Object.keys(groupedAdjustments).length - adjustmentList.length;
      if (skippedCount > 0) {
        toast.warning(`Skipped ${skippedCount} package(s) with no net quantity change.`);
      }

      setProcessingStatus({ active: true, current: 0, total: adjustmentList.length });
      setProgress(0);

      const reasonObj = reportToMetrc ? adjustmentReasons.find((r) => r.Name === selectedReason) : null;

      let successCount = 0;
      for (let i = 0; i < adjustmentList.length; i++) {
        const { id, advertisedId, totalDifference, ...finalData } = adjustmentList[i];

        try {
          const promises: Promise<any>[] = [createPackageAdjustment(finalData)];

          if (reportToMetrc && reasonObj) {
            promises.push(
              createMetrcBulkPackageAdjustments({
                shopId,
                packages: [
                  {
                    packagePlatformId: id,
                    adjustedQuantity: totalDifference,
                    reasonId: reasonObj?.platformId || "",
                    notes: adjustmentNotes,
                  },
                ],
              })
            );
          }

          await Promise.all(promises);
          successCount++;
        } catch (err: any) {
          console.error(`Error adjusting package ${advertisedId}:`, err);
          toast.error(`Failed to adjust package: ${err?.message || advertisedId}`);
        }

        const current = i + 1;
        setProcessingStatus((prev) => ({ ...prev, current }));
        setProgress(Math.round((current / adjustmentList.length) * 100));
      }

      toast.success(
        `Successfully processed ${successCount} of ${adjustmentList.length} package(s).${reportToMetrc ? " Reported to Metrc." : ""}`
      );
      setSelectedReason(undefined);
      setAdjustmentNotes("");
      setReportToMetrc(false);
      onCompleted();
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete adjustments.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setProcessingStatus({ active: false, current: 0, total: 0 });
        setProgress(0);
      }, 500);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} side="right" size={900} zIndex={1000}>
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
        <h2 className="text-base font-semibold">Adjust Packages</h2>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          <strong className="text-foreground">Metrc adjustments will not occur</strong> unless &quot;Report to
          Metrc&quot; is checked below. This only adjusts Bleaum inventory by default — use the Metrc reconciliation
          tool separately to bulk-adjust in Metrc.
        </div>

        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>Product</TableHead>
                <TableHead>Package ID</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Current</TableHead>
                <TableHead className="text-center">Adjustment</TableHead>
                <TableHead className="text-center">After</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {validAdjustments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No pending adjustments.
                  </TableCell>
                </TableRow>
              )}
              {validAdjustments.map((adj) => {
                const diff = adj.newQty - adj.originalQty;
                const key = adjustmentKey(adj);
                return (
                  <TableRow key={key}>
                    <TableCell className="max-w-[180px] truncate">{adj.productName}</TableCell>
                    <TableCell className="font-mono text-xs">{adj.advertisedId}</TableCell>
                    <TableCell>{adj.locationName}</TableCell>
                    <TableCell className="text-center">
                      {adj.originalQty} {adj.uom}
                    </TableCell>
                    <TableCell className={`text-center font-semibold ${diff >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {diff >= 0 ? "+" : ""}
                      {diff}
                    </TableCell>
                    <TableCell className="text-center">
                      {adj.newQty} {adj.uom}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => onRemove(key)} className="text-orange-500 hover:text-orange-600">
                        <XCircle className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold">
            Adjustment Reasons <span className="text-destructive">*</span>
          </label>
          <Select value={selectedReason} onValueChange={setSelectedReason}>
            <SelectTrigger className="w-full" disabled={processingStatus.active}>
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              {adjustmentReasons.map((r) => (
                <SelectItem key={r.platformId} value={r.Name}>
                  {r.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold">
            Adjustment Notes <span className="text-destructive">*</span>
          </label>
          <Textarea
            rows={3}
            placeholder="Adjustment Notes"
            value={adjustmentNotes}
            onChange={(e) => setAdjustmentNotes(e.target.value)}
            disabled={processingStatus.active}
          />
        </div>

        <label className="flex items-center gap-2">
          <Checkbox
            checked={reportToMetrc}
            onCheckedChange={(c) => setReportToMetrc(!!c)}
            disabled={processingStatus.active}
          />
          <span className="text-sm font-semibold">Report to Metrc</span>
        </label>

        {reportToMetrc && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            <div className="font-semibold">Metrc Reporting Enabled</div>
            <div className="text-xs leading-relaxed">
              This adjustment will also be reported to Metrc. Make sure the selected reason and notes are correct
              before completing.
            </div>
          </div>
        )}

        {processingStatus.active ? (
          <div className="flex flex-col gap-2 border-t pt-4">
            <div className="flex justify-between text-sm font-semibold">
              <span>Processing Adjustments...</span>
              <span>
                {processingStatus.current} / {processingStatus.total}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <div className="flex gap-2 border-t pt-4">
            <Button
              onClick={handleComplete}
              disabled={!selectedReason || !adjustmentNotes || validAdjustments.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              Complete Adjustments
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
