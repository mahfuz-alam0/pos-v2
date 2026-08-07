"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Package, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { fetchSinglePackage } from "@/services/packages/getSingle";
import { activatePackage } from "@/services/packages/activate";
import { deactivatePackage } from "@/services/packages/deactivate";
import { continuePackage } from "@/services/packages/continue";
import { discontinuePackage } from "@/services/packages/discontinue";
import { detachPackage } from "@/services/packages/detach";
import { pullPackageCoa } from "@/services/packages/pullCoa";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

import PackageIdCard from "./PackageIdCard";
import ConvertPackageDialog from "./ConvertPackageDialog";
import ReconcilePackageDrawer from "./ReconcilePackageDrawer";
import ImportPackageDrawer from "./ImportPackageDrawer";
import PackageActivityDrawer from "./PackageActivityDrawer";
import type { PackageDetail } from "./types";

function fmtDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mb-3 flex w-full items-center justify-between">
      <div className="w-[40%] font-semibold">{label}</div>
      <div className="line-clamp-3 w-[60%] text-right">{value}</div>
    </div>
  );
}

function StatusBadge({ active, yesLabel = "Active", noLabel = "Inactive" }: { active?: boolean; yesLabel?: string; noLabel?: string }) {
  return active ? (
    <Badge className="bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">{yesLabel}</Badge>
  ) : (
    <Badge className="bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">{noLabel}</Badge>
  );
}

// Faithful port of the old PackageInventoryStatus.js — quantityLeft /
// originalQuantity progress bar, using shadcn Progress instead of a raw div.
function PackageInventoryStatus({ packageDetail }: { packageDetail: PackageDetail | null }) {
  if (!packageDetail) return null;
  const original = packageDetail.originalQuantity ?? 0;
  const left = packageDetail.quantityLeft ?? 0;
  const percentage = original ? Math.round((left / original) * 100) : 0;

  return (
    <div className="mb-4">
      <div className="mb-1.5 text-sm text-foreground">{left} left</div>
      <Progress value={percentage}>
        <ProgressTrack>
          <ProgressIndicator className="bg-emerald-500" />
        </ProgressTrack>
      </Progress>
    </div>
  );
}

function LabResultsTable({ data }: { data: NonNullable<PackageDetail["metrcData"]>["labResults"] }) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <Table>
        <TableHeader className="[&_tr]:border-b-0">
          <TableRow className="bg-muted/60">
            <TableHead>Test Name</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Pass Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data ?? []).map((test, i) => (
            <TableRow key={test.id ?? i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
              <TableCell>{test.testName ?? "-"}</TableCell>
              <TableCell>{test.testResultLevel ?? "-"}</TableCell>
              <TableCell>{fmtDate(test.testPerformedDate)}</TableCell>
              <TableCell>
                {test.testPassed ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">Yes</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">No</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function PackageDetailsPanel({
  id,
  onClose,
  onChanged,
  locationMap,
  onOpenImportDrawer,
  onTransfer,
  onConvert,
  onReconcile,
  onActivity,
  onEditPricing,
  onEditProduct,
}: {
  id: string;
  onClose: () => void;
  onChanged?: () => void;
  locationMap?: Record<string, string>;
  onOpenImportDrawer?: () => void;
  onTransfer?: () => void;
  onConvert?: () => void;
  onReconcile?: () => void;
  onActivity?: () => void;
  onEditPricing?: () => void;
  onEditProduct?: () => void;
}) {
  const { shopId } = useShop();
  const metrcMechanism = useFeatureAccess();

  const [loading, setLoading] = useState(true);
  const [packageDetail, setPackageDetail] = useState<PackageDetail | null>(null);

  const [activationToggleLoading, setActivationToggleLoading] = useState(false);
  const [detachLoading, setDetachLoading] = useState(false);
  const [continuePackageLoading, setContinuePackageLoading] = useState(false);
  const [discontinuePackageLoading, setDiscontinuePackageLoading] = useState(false);
  const [pullCoaLoading, setPullCoaLoading] = useState(false);

  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [detachConfirmOpen, setDetachConfirmOpen] = useState(false);
  const [syncWithMetrc, setSyncWithMetrc] = useState(false);
  const [metrcInfoOpen, setMetrcInfoOpen] = useState(true);

  const [convertOpen, setConvertOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const fetchDetail = async () => {
    if (!shopId || !id) return;
    setLoading(true);
    try {
      const res = await fetchSinglePackage(shopId as string, { id });
      const pkg = res?.data?.data?.package ?? res?.data?.data ?? null;
      setPackageDetail(pkg);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load package");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && shopId) fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, shopId]);

  const refreshPackageDetails = async () => {
    await fetchDetail();
    onChanged?.();
  };

  const isMetrc = packageDetail?.source === "METRC";
  const isFinishedPkg = !!packageDetail?.isFinished;
  const isProductImported = !!(packageDetail?.productId && packageDetail?.isProductImported !== false);

  const handleToggleActivate = async () => {
    if (!packageDetail?.id || !shopId) return;
    setActivationToggleLoading(true);
    const shouldActivate = !packageDetail.isActive;
    try {
      if (shouldActivate) {
        await activatePackage(packageDetail.id, shopId as string, isMetrc);
        toast.success(`Package ${packageDetail.advertisedId ?? ""} activated successfully`);
      } else {
        await deactivatePackage(packageDetail.id, shopId as string, isMetrc);
        toast.success(`Package ${packageDetail.advertisedId ?? ""} deactivated successfully`);
      }
      await refreshPackageDetails();
    } catch {
      toast.error(shouldActivate ? "Failed to activate package" : "Failed to deactivate package");
    } finally {
      setActivationToggleLoading(false);
    }
  };

  const handleDetach = async () => {
    if (!packageDetail?.id || !shopId) return;
    setDetachLoading(true);
    try {
      await detachPackage(packageDetail.id, shopId as string, isMetrc);
      toast.success("Package detached successfully");
      setDetachConfirmOpen(false);
      await refreshPackageDetails();
    } catch {
      toast.error("Failed to detach package");
    } finally {
      setDetachLoading(false);
    }
  };

  const handleDiscontinuePackage = async () => {
    if (!packageDetail?.id || !shopId) return;
    setDiscontinuePackageLoading(true);
    try {
      const res = await discontinuePackage(packageDetail.id, shopId as string, isMetrc, isMetrc ? syncWithMetrc : undefined);
      toast.success("Package Successfully Finished");
      const silentErrors = res?.data?.data?.silentErrors;
      if (silentErrors?.length > 0) {
        silentErrors.forEach((msg: string) => toast.warning(msg));
      }
      setFinishConfirmOpen(false);
      setSyncWithMetrc(false);
      await refreshPackageDetails();
    } catch (error: any) {
      toast.error(error?.error || "Failed to finish package");
    } finally {
      setDiscontinuePackageLoading(false);
    }
  };

  const handleContinuePackage = async () => {
    if (!packageDetail?.id || !shopId) return;
    setContinuePackageLoading(true);
    try {
      const res = await continuePackage(packageDetail.id, shopId as string, isMetrc, isMetrc ? syncWithMetrc : undefined);
      toast.success("Package Successfully Restored");
      const silentErrors = res?.data?.data?.silentErrors;
      if (silentErrors?.length > 0) {
        silentErrors.forEach((msg: string) => toast.warning(msg));
      }
      setRestoreConfirmOpen(false);
      setSyncWithMetrc(false);
      await refreshPackageDetails();
    } catch (error: any) {
      toast.error(error?.error || "Failed to restore package");
    } finally {
      setContinuePackageLoading(false);
    }
  };

  const handlePullCoa = async () => {
    if (!packageDetail?.id || !shopId) return;
    setPullCoaLoading(true);
    try {
      await pullPackageCoa(packageDetail.id, shopId as string);
      toast.success("Lab results pulled from METRC");
      await refreshPackageDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to pull COA");
    } finally {
      setPullCoaLoading(false);
    }
  };

  const storageLocations = Object.entries(packageDetail?.storageLocationBreakdown ?? {})
    .map(([locId, quantity]) => ({ id: locId, quantity: Number(quantity) || 0 }))
    .filter((loc) => loc.quantity > 0);

  const snapshot = packageDetail?.metrcData?.snapShotData?.metrcSnapshotData;
  const cannabisProps = packageDetail?.additionalCannabisProps;
  const labResults = packageDetail?.metrcData?.labResults ?? [];

  if (loading) {
    return (
      <div className="flex w-1/3 flex-col gap-4 rounded-xl p-5 ring-1 ring-foreground/10">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!packageDetail) {
    return (
      <div className="flex w-1/3 flex-col items-center justify-center gap-3 rounded-xl p-10 ring-1 ring-foreground/10">
        <Package className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Package not found.</p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  const discountPercent = packageDetail.discountPercent ?? 0;
  const effectiveUnitCost =
    discountPercent > 0
      ? (packageDetail as any).effectiveUnitCost ?? (packageDetail.unitCost ?? 0) * (1 - discountPercent / 100)
      : undefined;

  return (
    <div className="flex w-1/3 flex-col gap-4 rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold">{packageDetail.name ?? "Package"}</h2>
            <Badge
              className={
                isMetrc
                  ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
              }
            >
              {isMetrc ? "METRC" : "Regular"}
            </Badge>
            <StatusBadge active={packageDetail.isActive} />
          </div>
          <p className="text-xs text-muted-foreground">{packageDetail.advertisedId}</p>
        </div>
        <Button variant="outline" size="icon" onClick={onClose} className="shrink-0">
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {/* Attached Product card */}
        {!isFinishedPkg && (
          <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold">Attached Product</div>
              <div className="flex gap-2">
                {packageDetail.productId && packageDetail.isProductImported && (
                  <Button variant="outline" size="sm" onClick={() => onEditPricing?.()}>
                    Edit Pricing
                  </Button>
                )}
                {packageDetail.productId && (
                  <Button variant="outline" size="sm" onClick={() => onEditProduct?.()}>
                    Edit Product
                  </Button>
                )}
              </div>
            </div>
            <div className="mb-3 h-px bg-border" />

            {packageDetail.productId ? (
              <>
                <div className="rounded-xl bg-blue-50 p-2.5 ring-1 ring-blue-200 dark:bg-blue-950/20 dark:ring-blue-900">
                  <div className="flex items-center gap-2.5">
                    <img
                      alt={packageDetail.productName ?? "Product"}
                      src={packageDetail.productImageUrl || "/images/placeholders/product.svg"}
                      className="size-10 shrink-0 rounded-md border border-blue-200 bg-background object-cover dark:border-blue-900"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-semibold text-blue-600 dark:text-blue-400"
                        title={packageDetail.productName}
                      >
                        {packageDetail.productName ?? "Unnamed product"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {packageDetail.category ? packageDetail.category.name : "No Category"}
                        {" · "}
                        {packageDetail.brand ? packageDetail.brand.name : "No Brand"}
                      </p>
                    </div>
                  </div>
                </div>
                {isProductImported && (
                  <div className="mt-3 flex w-full">
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={detachLoading}
                      onClick={() => setDetachConfirmOpen(true)}
                    >
                      Detach
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-6 text-center">
                <Package className="mb-2 size-8 text-muted-foreground" />
                <p className="mb-1 text-sm font-medium">No product attached</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Import this package to link it to a product and start selling it.
                </p>
                <Button
                  onClick={() => {
                    setImportOpen(true);
                    onOpenImportDrawer?.();
                  }}
                >
                  Import
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Package Details card */}
        <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4">
          <div className="font-semibold">Packages Details</div>
          <div className="my-3 h-px bg-border" />

          <div className="mb-3 flex flex-wrap gap-2">
            {isProductImported && !isFinishedPkg && (
              <Button onClick={handleToggleActivate} disabled={activationToggleLoading}>
                {activationToggleLoading ? "Please wait..." : packageDetail.isActive ? "Deactivate" : "Activate"}
              </Button>
            )}
            {!isFinishedPkg ? (
              <Button
                onClick={() => {
                  setSyncWithMetrc(false);
                  setFinishConfirmOpen(true);
                }}
                disabled={discontinuePackageLoading}
              >
                Finish
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setSyncWithMetrc(false);
                  setRestoreConfirmOpen(true);
                }}
                disabled={continuePackageLoading}
              >
                Restore
              </Button>
            )}
            {storageLocations.length > 0 && <Button onClick={() => onTransfer?.()}>Transfer</Button>}
            {packageDetail.source !== "METRC" && (
              <Button
                onClick={() => {
                  setConvertOpen(true);
                  onConvert?.();
                }}
              >
                Convert
              </Button>
            )}
            <Button
              onClick={() => {
                setReconcileOpen(true);
                onReconcile?.();
              }}
            >
              Reconcile
            </Button>
            <Button
              onClick={() => {
                setActivityOpen(true);
                onActivity?.();
              }}
            >
              Activity
            </Button>
          </div>

          <PackageIdCard packageDetail={packageDetail} onChanged={refreshPackageDetails} />
          <PackageInventoryStatus packageDetail={packageDetail} />
          <div className="my-3 h-px bg-border" />

          <div className="mb-3 flex justify-end">
            <Badge className="bg-orange-100 text-red-600 dark:bg-orange-950/40 dark:text-red-400">
              {(packageDetail as any).packageType ?? "N/A"}
            </Badge>
          </div>

          <DetailRow label="Package ID:" value={packageDetail.advertisedId ?? "N/A"} />
          <DetailRow label="Package Name:" value={packageDetail.name ?? "N/A"} />
          <DetailRow
            label="Unit Cost:"
            value={packageDetail.unitCost != null ? `$${packageDetail.unitCost}` : "N/A"}
          />
          {discountPercent > 0 && (
            <DetailRow
              label="Discount:"
              value={
                <span className="inline-flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">
                    {discountPercent}% off
                  </Badge>
                  <span className="text-muted-foreground">Effective Unit Cost: ${effectiveUnitCost?.toFixed(2)}</span>
                </span>
              }
            />
          )}
          <DetailRow label="Category:" value={packageDetail.category?.name ?? "N/A"} />
          <DetailRow label="Brand:" value={packageDetail.brand?.name ?? "N/A"} />
          <DetailRow label="Creation Date:" value={packageDetail.createdAt?.split("T")[0] ?? "N/A"} />
          <DetailRow
            label="Original Quantity:"
            value={`${packageDetail.originalQuantity ?? "-"} ${packageDetail.uoMShortForm ?? ""}`}
          />
          <DetailRow
            label="Current Quantity:"
            value={`${packageDetail.quantityLeft ?? "-"} ${packageDetail.uoMShortForm ?? ""}`}
          />
          <DetailRow label="Expiry Date:" value={fmtDate(packageDetail.expiry)} />
          <DetailRow label="Package Status:" value={<StatusBadge active={packageDetail.isActive} />} />
          <DetailRow
            label="Is Sample:"
            value={<StatusBadge active={packageDetail.isSample} yesLabel="Yes" noLabel="No" />}
          />
          <DetailRow label="Supplier:" value={packageDetail.supplierName ?? "-"} />
          <DetailRow
            label="Source:"
            value={
              <Badge
                className={
                  packageDetail.source === "PLATFORM"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                    : packageDetail.source === "METRC"
                    ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                    : ""
                }
                variant={packageDetail.source ? "default" : "outline"}
              >
                {packageDetail.source === "PLATFORM" ? "Regular" : packageDetail.source === "METRC" ? "METRC" : packageDetail.source ?? "Unknown"}
              </Badge>
            }
          />

          {!isFinishedPkg && packageDetail.source === "METRC" && (
            <div className="mt-2 overflow-hidden rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setMetrcInfoOpen((v) => !v)}
                className="flex w-full items-center justify-between bg-muted/50 px-3 py-2 text-left text-sm font-semibold"
              >
                METRC Information
                <span className="text-xs text-muted-foreground">{metrcInfoOpen ? "Hide" : "Show"}</span>
              </button>
              {metrcInfoOpen && (
                <div className="p-3">
                  <DetailRow label="Metrc ID:" value={packageDetail.metrcData?.metrcId ?? "N/A"} />
                  <DetailRow label="Metrc Tag:" value={packageDetail.metrcData?.metrcTag ?? "N/A"} />
                  <DetailRow label="Metrc Label:" value={packageDetail.metrcData?.snapShotData?.metrcSnapshotData?.Label ?? "N/A"} />
                  <DetailRow label="Batch ID:" value={packageDetail.metrcData?.batchId ?? "N/A"} />
                  <DetailRow label="Metrc Source Product Name:" value={snapshot?.ProductName ?? "N/A"} />
                  <DetailRow
                    label="Metrc Source Product Quantity:"
                    value={
                      snapshot?.Quantity != null
                        ? `${snapshot.Quantity}${snapshot.UnitOfMeasureName ?? ""}`
                        : "N/A"
                    }
                  />
                  <DetailRow label="Metrc Source Category Name:" value={snapshot?.ProductCategoryName ?? "N/A"} />
                  <DetailRow label="Metrc Source Strain Name:" value={snapshot?.ItemStrainName ?? "N/A"} />
                  <DetailRow label="Expiry Date:" value={packageDetail.expiry ?? "-"} />
                  <DetailRow label="Status:" value={<StatusBadge active={snapshot?.PackageState ? snapshot.PackageState === "Active" : packageDetail.isActive} />} />
                  <DetailRow
                    label="Is Sample:"
                    value={<StatusBadge active={!snapshot?.IsSample} yesLabel="No Sample" noLabel="Sample" />}
                  />
                  <DetailRow label="Supplier:" value={snapshot?.SupplierName ?? "-"} />
                  <DetailRow label="Storage Location:" value={snapshot?.LocationName ?? "-"} />
                  <DetailRow label="Date Tested:" value={snapshot?.DateTested?.split("T")[0] ?? "N/A"} />
                  <DetailRow
                    label="THC Content:"
                    value={cannabisProps?.thcContent != null ? `${cannabisProps.thcContent}${cannabisProps.testUom === "MILLIGRAM" ? "mg" : "%"}` : "N/A"}
                  />
                  <DetailRow label="THC Content (Dose):" value="N/A" />
                  <DetailRow
                    label="CBD Content:"
                    value={cannabisProps?.cbdContent != null ? `${cannabisProps.cbdContent}${cannabisProps.testUom === "MILLIGRAM" ? "mg" : "%"}` : "N/A"}
                  />
                  <DetailRow label="CBD Content (Dose):" value="N/A" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lab Results card */}
        {packageDetail.metrcData && (
          <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold">Lab Results</div>
              {packageDetail.source === "METRC" && !!metrcMechanism && (
                <Button variant="outline" size="sm" onClick={handlePullCoa} disabled={pullCoaLoading}>
                  <FileText className="size-3.5" />
                  {pullCoaLoading ? "Pulling..." : "Pull COA"}
                </Button>
              )}
            </div>
            <div className="mb-3 h-px bg-border" />
            {labResults.length > 0 ? <LabResultsTable data={labResults} /> : <p className="text-sm text-muted-foreground">N/A</p>}
          </div>
        )}

        {/* Storage location breakdown */}
        {storageLocations.length > 0 && (
          <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4">
            <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <Table>
                <TableHeader className="[&_tr]:border-b-0">
                  <TableRow className="bg-muted/60">
                    <TableHead>Storage Location</TableHead>
                    <TableHead>Storage Location Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storageLocations.map((loc, i) => (
                    <TableRow key={loc.id} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                      <TableCell>{locationMap?.[loc.id] ?? loc.id}</TableCell>
                      <TableCell>
                        {loc.quantity} {packageDetail.uoMShortForm}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Finish Confirmation */}
      <AlertDialog open={finishConfirmOpen} onOpenChange={(open) => {
        setFinishConfirmOpen(open);
        if (!open) setSyncWithMetrc(false);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this package as finished? This will make it inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!!packageDetail.metrcData && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Report to METRC</p>
                  <p className="text-xs text-muted-foreground">Also finish this package in METRC</p>
                </div>
                <Switch checked={syncWithMetrc} onCheckedChange={setSyncWithMetrc} />
              </div>
              {syncWithMetrc && (
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                  This package will also be marked as finished in METRC.
                </div>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={discontinuePackageLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscontinuePackage} disabled={discontinuePackageLoading}>
              {discontinuePackageLoading ? "Finishing..." : "Yes, Finish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation */}
      <AlertDialog open={restoreConfirmOpen} onOpenChange={(open) => {
        setRestoreConfirmOpen(open);
        if (!open) setSyncWithMetrc(false);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this package? It will become active again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!!packageDetail.metrcData && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Report to METRC</p>
                  <p className="text-xs text-muted-foreground">Also restore this package in METRC</p>
                </div>
                <Switch checked={syncWithMetrc} onCheckedChange={setSyncWithMetrc} />
              </div>
              {syncWithMetrc && (
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                  This package will also be restored in METRC.
                </div>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={continuePackageLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleContinuePackage} disabled={continuePackageLoading}>
              {continuePackageLoading ? "Restoring..." : "Yes, Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detach Confirmation */}
      <AlertDialog open={detachConfirmOpen} onOpenChange={setDetachConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Detach Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to detach this package from its product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={detachLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDetach} disabled={detachLoading}>
              {detachLoading ? "Detaching..." : "Yes, Detach"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {packageDetail && (
        <>
          <ConvertPackageDialog
            open={convertOpen}
            onClose={() => setConvertOpen(false)}
            packageDetail={packageDetail}
            onConverted={() => {
              setConvertOpen(false);
              refreshPackageDetails();
              onChanged?.();
            }}
          />

          <ReconcilePackageDrawer
            open={reconcileOpen}
            onClose={() => setReconcileOpen(false)}
            packageDetail={packageDetail}
            onReconciled={() => {
              setReconcileOpen(false);
              refreshPackageDetails();
              onChanged?.();
            }}
          />

          <ImportPackageDrawer
            open={importOpen}
            onClose={() => setImportOpen(false)}
            packageDetail={packageDetail}
            onImported={() => {
              setImportOpen(false);
              refreshPackageDetails();
              onChanged?.();
            }}
          />

          <PackageActivityDrawer open={activityOpen} packageId={id} onClose={() => setActivityOpen(false)} />
        </>
      )}
    </div>
  );
}
