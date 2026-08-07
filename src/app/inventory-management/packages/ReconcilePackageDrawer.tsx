"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { createPackageAdjustment } from "@/services/packageAdjustments/create";
import { reconcileMetrcPackages } from "@/services/packageReconciliation/reconcileMetrcPackages";
import { fetchMetrcAdjustmentReasons } from "@/services/packageReconciliation/metrcAdjustmentReasons";
import { fetchStorageLocations } from "@/services/storageLocations/list";
import { useCurrentUser } from "@/util/use-current-user";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

interface StorageLocationOption {
  id: string;
  name: string;
}

type CountingMechanism = "Manual" | "Scan";

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
  // A package with neither a linked product nor an inventory record hasn't
  // been imported yet — old app blocks reconcile entirely in that case.
  const needsImport = !packageDetail?.productId && !packageDetail?.inventoryId;

  const userType = useCurrentUser()?.type;
  const canApprove = userType === "SUPER_ADMIN" || userType === "ADMINISTRATION";

  const [rows, setRows] = useState<LocationRow[]>([]);
  const [initiationReason, setInitiationReason] = useState("");
  const [initiationReasonReferenceId, setInitiationReasonReferenceId] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [reportToMetrc, setReportToMetrc] = useState(false);
  const [metrcReasons, setMetrcReasons] = useState<MetrcReasonOption[]>([]);
  const [submitting, setSubmitting] = useState<"approve" | "send" | null>(null);

  const [countingMechanism, setCountingMechanism] = useState<CountingMechanism>("Manual");
  const [storageLocations, setStorageLocations] = useState<StorageLocationOption[]>([]);
  const [selectedStorageLocation, setSelectedStorageLocation] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState("");
  const scanClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows(buildLocationRows(packageDetail));
    setInitiationReason("");
    setInitiationReasonReferenceId("");
    setAdditionalNotes("");
    setReportToMetrc(false);
    setSubmitting(null);
    setCountingMechanism("Manual");
    setSelectedStorageLocation(null);
    setScanInput("");

    if (packageDetail?.metrcData) {
      fetchMetrcAdjustmentReasons()
        .then((res) => setMetrcReasons(res?.data?.reasons ?? []))
        .catch(() => toast.error("Failed to load METRC adjustment reasons"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, packageDetail]);

  useEffect(() => {
    if (!open || !shopId) return;
    fetchStorageLocations(shopId as string)
      .then((res) => setStorageLocations(res?.data?.data?.locations ?? []))
      .catch(() => setStorageLocations([]));
  }, [open, shopId]);

  // Switching counting mechanism resets every row's count: Scan starts from
  // zero (assumes a fresh physical recount), Manual starts from the on-record
  // quantity — matches the old app's behavior on mechanism change.
  const handleCountingMechanismChange = (mechanism: CountingMechanism) => {
    setCountingMechanism(mechanism);
    setRows((prev) =>
      prev.map((row) =>
        mechanism === "Scan"
          ? { ...row, quantityOnHand: 0, differenceCount: -row.quantity }
          : { ...row, quantityOnHand: row.quantity, differenceCount: 0 }
      )
    );
  };

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

  // Scan mode: each scan of the package's own advertisedId barcode bumps the
  // selected storage location's on-hand count by one.
  const handleScanInputChange = (value: string) => {
    setScanInput(value);
    if (scanClearRef.current) clearTimeout(scanClearRef.current);

    if (countingMechanism === "Scan" && selectedStorageLocation && value === packageDetail?.advertisedId) {
      setRows((prev) =>
        prev.map((row) =>
          row.storageLocationId === selectedStorageLocation
            ? { ...row, quantityOnHand: row.quantityOnHand + 1, differenceCount: row.quantityOnHand + 1 - row.quantity }
            : row
        )
      );
    }

    scanClearRef.current = setTimeout(() => setScanInput(""), 1500);
  };

  const notesRequired = reportToMetrc && !additionalNotes.trim();

  const canSubmit = Boolean(initiationReason) && filteredRows.length > 0 && !needsImport && !notesRequired && !submitting;

  const handleSubmit = async (shouldApprove: boolean) => {
    if (needsImport) {
      toast.error("This package must be imported before it can be reconciled.");
      return;
    }
    if (!initiationReason) {
      toast.error("Adjustment reason is required.");
      return;
    }
    if (filteredRows.length === 0) {
      toast.error("At least one storage location must have a quantity difference.");
      return;
    }
    if (notesRequired) {
      toast.error("Additional Notes is required when reporting to Metrc.");
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
    <Drawer open={open} onClose={submitting ? undefined : onClose} side="right" size="50vw">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div>
            <div className="text-base font-semibold leading-tight">Reconcile Package</div>
            <div className="text-xs text-muted-foreground leading-tight">
              Adjust on-hand quantity per storage location
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-foreground/70">
          {needsImport && (
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <div>
                <div className="mb-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Import Package Required
                </div>
                <div className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                  This package is not associated with any storage location. Please import it first to
                  enable reconciliation.
                </div>
              </div>
            </div>
          )}

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
            <Label className="mb-2">Counting Mechanism</Label>
            <Select
              items={[
                { value: "Manual", label: "Manual" },
                { value: "Scan", label: "Scan" },
              ]}
              value={countingMechanism}
              onValueChange={(v) => handleCountingMechanismChange(v as CountingMechanism)}
            >
              <SelectTrigger className="h-9! w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Manual">Manual</SelectItem>
                <SelectItem value="Scan">Scan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {countingMechanism === "Scan" && (
            <div className="space-y-2">
              <Select
                items={[
                  { value: "__none__", label: "Select Storage Location" },
                  ...storageLocations.map((l) => ({ value: l.id, label: l.name })),
                ]}
                value={selectedStorageLocation ?? "__none__"}
                onValueChange={(v) => setSelectedStorageLocation(v === "__none__" ? null : v)}
              >
                <SelectTrigger className="h-9! w-full">
                  <SelectValue placeholder="Select Storage Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>
                    Select Storage Location
                  </SelectItem>
                  {storageLocations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedStorageLocation && (
                <Input
                  placeholder="Scan the barcode / enter the barcode"
                  value={scanInput}
                  onChange={(e) => handleScanInputChange(e.target.value)}
                  onPaste={(e) => handleScanInputChange(e.clipboardData.getData("text"))}
                />
              )}
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-medium">Storage Locations</h3>
            {rows.length === 0 ? (
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                No storage location breakdown available for this package.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-foreground/70">
                      <TableHead>Storage Location</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Quantity on Hand</TableHead>
                      <TableHead>Difference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.storageLocationId}>
                        <TableCell className="font-medium">{row.storageLocationName}</TableCell>
                        <TableCell>
                          {row.quantity} {uomShortForm(packageDetail)}
                        </TableCell>
                        <TableCell>
                          <div className="flex h-9 w-32 items-center overflow-hidden rounded-lg border border-input">
                            <input
                              type="number"
                              disabled={countingMechanism === "Scan"}
                              value={row.quantityOnHand}
                              onChange={(e) =>
                                updateQuantityOnHand(
                                  row.storageLocationId,
                                  e.target.value === "" ? 0 : Number(e.target.value)
                                )
                              }
                              className="h-full w-full min-w-0 bg-transparent px-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <span className="flex h-full shrink-0 items-center border-l border-input px-2 text-xs text-muted-foreground">
                              {uomShortForm(packageDetail)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell
                          className={`font-medium ${
                            row.differenceCount > 0
                              ? "text-green-600"
                              : row.differenceCount < 0
                              ? "text-destructive"
                              : "text-primary"
                          }`}
                        >
                          {row.differenceCount > 0 ? "+" : ""}
                          {row.differenceCount} {uomShortForm(packageDetail)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                <SelectTrigger className="h-9! w-full">
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
            <Label className="mb-2">
              {reportToMetrc ? (
                <>
                  Additional Notes <span className="text-destructive">*</span>
                </>
              ) : (
                "Additional Notes (Optional)"
              )}
            </Label>
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
            className="h-9! rounded! px-3.5! text-[14px]! font-normal!"
            variant="outline"
            disabled={!canSubmit}
            onClick={() => handleSubmit(false)}
          >
            {submitting === "send" ? "Sending..." : "Send For Approval"}
          </Button>
          {/* Approve & Reconcile immediately applies the adjustment — old app
              restricts that to SUPER_ADMIN / ADMINISTRATION accounts. */}
          {canApprove && (
            <Button
              className="h-9! rounded! px-3.5! text-[14px]! font-normal!"
              disabled={!canSubmit}
              onClick={() => handleSubmit(true)}
            >
              {submitting === "approve" ? "Reconciling..." : "Approve & Reconcile"}
            </Button>
          )}
        </div>
      </div>
    </Drawer>
  );
}
