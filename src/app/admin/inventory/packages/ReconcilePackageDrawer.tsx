"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { createPackageAdjustment } from "@/services/packageAdjustments/create";
import { reconcileMetrcPackages } from "@/services/packageReconciliation/reconcileMetrcPackages";
import { fetchMetrcAdjustmentReasons } from "@/services/packageReconciliation/metrcAdjustmentReasons";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReconcilePackageDrawerProps {
  open: boolean;
  onClose: () => void;
  packageDetail: any;
  onReconciled: () => void;
}

interface LocationRow {
  storageLocationId: string;
  storageLocationName: string;
  quantity: number;
  quantityOnHand: number;
  differenceCount: number;
}

interface MetrcReasonOption {
  Name: string;
  platformId: string;
}

function uomShortForm(packageDetail: any) {
  return packageDetail?.uoMShortForm ?? "ea";
}

function buildLocationRows(packageDetail: any): LocationRow[] {
  const breakdown = packageDetail?.storageLocationBreakdown;
  if (!breakdown) return [];

  // storageLocationBreakdown may come as an object map ({ [locationId]: qty })
  // per types.ts, or as an array of { id, name, quantity } from the API detail
  // response (as in the old app) — support both shapes defensively.
  if (Array.isArray(breakdown)) {
    return breakdown.map((loc: any) => ({
      storageLocationId: loc.id ?? loc.storageLocationId,
      storageLocationName: loc.name ?? loc.storageLocationName ?? "Unknown",
      quantity: loc.quantity ?? 0,
      quantityOnHand: loc.quantity ?? 0,
      differenceCount: 0,
    }));
  }

  return Object.entries(breakdown).map(([locationId, qty]) => ({
    storageLocationId: locationId,
    storageLocationName: locationId,
    quantity: Number(qty) || 0,
    quantityOnHand: Number(qty) || 0,
    differenceCount: 0,
  }));
}

export default function ReconcilePackageDrawer({
  open,
  onClose,
  packageDetail,
  onReconciled,
}: ReconcilePackageDrawerProps) {
  const { shopId } = useShop();

  const isMetrc = Boolean(packageDetail?.metrcData);

  const [rows, setRows] = useState<LocationRow[]>([]);
  const [initiationReason, setInitiationReason] = useState("");
  const [initiationReasonReferenceId, setInitiationReasonReferenceId] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [reportToMetrc, setReportToMetrc] = useState(false);
  const [metrcReasons, setMetrcReasons] = useState<MetrcReasonOption[]>([]);
  const [submitting, setSubmitting] = useState<"approve" | "send" | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows(buildLocationRows(packageDetail));
    setInitiationReason("");
    setInitiationReasonReferenceId("");
    setAdditionalNotes("");
    setReportToMetrc(false);
    setSubmitting(null);

    if (packageDetail?.metrcData) {
      fetchMetrcAdjustmentReasons()
        .then((res) => setMetrcReasons(res?.data?.reasons ?? []))
        .catch(() => toast.error("Failed to load METRC adjustment reasons"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, packageDetail]);

  const filteredRows = useMemo(
    () => rows.filter((row) => row.differenceCount !== 0),
    [rows]
  );

  const updateQuantityOnHand = (storageLocationId: string, value: number) => {
    setRows((prev) =>
      prev.map((row) =>
        row.storageLocationId === storageLocationId
          ? {
              ...row,
              quantityOnHand: value,
              differenceCount: value - row.quantity,
            }
          : row
      )
    );
  };

  const canSubmit =
    Boolean(initiationReason) &&
    filteredRows.length > 0 &&
    !submitting;

  const handleSubmit = async (shouldApprove: boolean) => {
    if (!initiationReason) {
      toast.error("Adjustment reason is required.");
      return;
    }
    if (filteredRows.length === 0) {
      toast.error("At least one storage location must have a quantity difference.");
      return;
    }

    setSubmitting(shouldApprove ? "approve" : "send");

    const storageLocationBreakdown = filteredRows.map((row) => ({
      storageLocationId: row.storageLocationId,
      quantity: row.quantityOnHand,
      differenceCount: row.differenceCount,
    }));

    const body = {
      shopId,
      additionalNotes,
      initiationReason,
      packageId: packageDetail?.id,
      storageLocationBreakdown,
      shouldApproveRightAway: shouldApprove,
      initiationReasonReferenceId: initiationReasonReferenceId || null,
    };

    try {
      const res = await createPackageAdjustment(body);

      if (res?.data?.success === false) {
        setSubmitting(null);
        return;
      }

      // Best-effort METRC sync: only fires when approving right away, the
      // "Report to Metrc" toggle is on, and the package actually has a
      // METRC advertisedId. If this call fails, warn but DO NOT treat the
      // primary reconcile as failed — it already succeeded above.
      if (shouldApprove && reportToMetrc && packageDetail?.advertisedId) {
        const totalDifferenceCount = filteredRows.reduce(
          (sum, row) => sum + (row.differenceCount || 0),
          0
        );

        try {
          await reconcileMetrcPackages({
            shopId,
            packages: [
              {
                packagePlatformId: packageDetail.advertisedId,
                adjustedQuantity: totalDifferenceCount,
                reasonId: initiationReasonReferenceId || null,
                notes: additionalNotes || null,
              },
            ],
          });
        } catch (metrcError: any) {
          toast.warning(metrcError?.message || "Failed to report adjustment to Metrc");
        }
      }

      toast.success(
        shouldApprove
          ? "Package has been reconciled successfully"
          : "Package reconcile request has been successfully generated"
      );
      onReconciled();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Drawer open={open} onClose={submitting ? undefined : onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div>
            <div className="text-base font-semibold leading-tight">Reconcile Package</div>
            <div className="text-xs text-muted-foreground leading-tight">
              Adjust on-hand quantity per storage location
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Package Details</h3>
            <div className="space-y-2 rounded-lg bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Package Name</span>
                <span className="text-xs font-medium">{packageDetail?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Package ID</span>
                <span className="text-xs font-medium">{packageDetail?.advertisedId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total Quantity</span>
                <span className="text-xs font-medium">
                  {packageDetail?.quantityLeft} {uomShortForm(packageDetail)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Storage Locations</h3>
            {rows.length === 0 ? (
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                No storage location breakdown available for this package.
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map((row) => (
                  <div
                    key={row.storageLocationId}
                    className="flex items-center gap-3 rounded-lg bg-muted/40 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {row.storageLocationName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        On record: {row.quantity} {uomShortForm(packageDetail)}
                      </div>
                    </div>
                    <div className="w-28 shrink-0">
                      <Input
                        type="number"
                        value={row.quantityOnHand}
                        onChange={(e) =>
                          updateQuantityOnHand(
                            row.storageLocationId,
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div
                      className={`w-20 shrink-0 text-right text-xs font-medium ${
                        row.differenceCount > 0
                          ? "text-green-600"
                          : row.differenceCount < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {row.differenceCount > 0 ? "+" : ""}
                      {row.differenceCount} {uomShortForm(packageDetail)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="mb-2">
              {isMetrc ? "Select Adjustment Reason" : "Initiation Reason"}{" "}
              <span className="text-destructive">*</span>
            </Label>
            {isMetrc ? (
              <Select
                items={metrcReasons.map((r) => ({ value: r.platformId, label: r.Name }))}
                value={initiationReasonReferenceId}
                onValueChange={(value) => {
                  const found = metrcReasons.find((r) => r.platformId === value);
                  setInitiationReason(found?.Name ?? "");
                  setInitiationReasonReferenceId(value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {metrcReasons.map((r) => (
                    <SelectItem key={r.platformId} value={r.platformId}>
                      {r.Name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Enter Initiation Reason"
                value={initiationReason}
                onChange={(e) => setInitiationReason(e.target.value)}
              />
            )}
          </div>

          <div>
            <Label className="mb-2">Additional Notes (Optional)</Label>
            <Textarea
              rows={3}
              placeholder="Enter additional notes..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
            />
          </div>

          {isMetrc && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={reportToMetrc}
                  onCheckedChange={(checked) => setReportToMetrc(checked === true)}
                />
                Report to Metrc
              </label>
              {reportToMetrc && (
                <div className="rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  This adjustment will also be reported to Metrc. Make sure the selected
                  reason and notes are correct before completing.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button
            variant="outline"
            disabled={!canSubmit}
            onClick={() => handleSubmit(false)}
          >
            {submitting === "send" ? "Sending..." : "Send For Approval"}
          </Button>
          <Button disabled={!canSubmit} onClick={() => handleSubmit(true)}>
            {submitting === "approve" ? "Reconciling..." : "Approve & Reconcile"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
