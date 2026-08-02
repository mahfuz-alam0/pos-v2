"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  Import,
  PauseCircle,
  PlayCircle,
  ShoppingCart,
  Unlink,
  Loader2,
} from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchPackageActivityLogs } from "@/services/packageActivityLogs/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OverallActivityLogsPanel } from "@/components/activity-logs/OverallActivityLogsPanel";
import type { StorageLocationBreakdown } from "./types";

const PAGE_SIZE = 10;

type LegacyFilter = "All" | "Today" | "Yesterday" | "Custom";

interface PackageActivityLog {
  _id: string;
  activityType?: string;
  employeeId?: string;
  employeeData?: { name?: string };
  quantity?: number;
  UOMId?: string;
  packageId?: string;
  orgId?: string;
  shopId?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  __v?: number;
  eventMetaData?: {
    packageInfo?: {
      name?: string;
      advertisedId?: string;
      unitCost?: number;
      quantityLeft?: number;
      packageType?: string;
      source?: string;
      isSample?: boolean;
      isImported?: boolean;
      wasFinished?: boolean;
      isActive?: boolean;
      originalBrand?: string;
      originalCategory?: string;
      manufacturerSKU?: string;
      externalBatchId?: string;
    };
    productInfo?: {
      productName?: string;
      compactName?: string;
      productId?: string;
    };
    inventoryInfo?: {
      inventoryId?: string;
      recommendedUnitPrice?: number;
      wasNewInventoryCreated?: boolean;
      wasPackageActivated?: boolean;
      wasPackageFinished?: boolean;
      isPackageActivated?: boolean;
      hasInventoryAttached?: boolean;
      hadInventoryAttached?: boolean;
      isActive?: boolean;
    };
    attachmentDetails?: {
      storageLocationBreakdown?: StorageLocationBreakdown;
      wasStorageLocationCorrupt?: boolean;
      sellableUoMId?: string;
      packageActiveStatus?: boolean;
    };
    updateResults?: {
      inventoryUpdateSuccess?: boolean;
      packageUpdateSuccess?: boolean;
      bothUpdatesSuccessful?: boolean;
    };
    saleId?: string;
    advertisedSaleId?: string;
    detachedBy?: string;
    detachedAt?: string;
    continuedBy?: string;
    continuedAt?: string;
    attachedBy?: string;
    attachedAt?: string;
    discontinuedAt?: string;
    deactivatedAt?: string;
    operationType?: string;
    [key: string]: any;
  };
}

const ACTIVITY_ICON: Record<string, { icon: typeof Clock; className: string }> = {
  IMPORTED: { icon: Import, className: "text-blue-600 dark:text-blue-400" },
  ACTIVATED: { icon: PlayCircle, className: "text-green-600 dark:text-green-400" },
  DEACTIVATED: { icon: PauseCircle, className: "text-orange-600 dark:text-orange-400" },
  FINISHED: { icon: Clock, className: "text-red-600 dark:text-red-400" },
  UNFINISHED: { icon: PlayCircle, className: "text-yellow-600 dark:text-yellow-400" },
  DETACHED: { icon: Unlink, className: "text-purple-600 dark:text-purple-400" },
  SOLD: { icon: ShoppingCart, className: "text-green-600 dark:text-green-400" },
};

const ACTIVITY_BADGE_CLASS: Record<string, string> = {
  IMPORTED: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  ACTIVATED: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  DEACTIVATED: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
  FINISHED: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  UNFINISHED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400",
  DETACHED: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
  SOLD: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
};

const DEFAULT_ACTIVITY_BADGE_CLASS = "bg-muted text-muted-foreground";

function getActivityIcon(activityType?: string) {
  return ACTIVITY_ICON[activityType?.toUpperCase() ?? ""] ?? { icon: Clock, className: "text-muted-foreground" };
}

function getActivityBadgeClass(activityType?: string) {
  return ACTIVITY_BADGE_CLASS[activityType?.toUpperCase() ?? ""] ?? DEFAULT_ACTIVITY_BADGE_CLASS;
}

function formatDate(dateString?: string) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" });
}

function formatTime(dateString?: string) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDateTime(dateString?: string) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getActivityDescription(log: PackageActivityLog) {
  const activityType = log.activityType?.toUpperCase();
  const packageName = log.eventMetaData?.packageInfo?.name || "Package";
  const quantity = log.quantity || 0;
  const productName = log.eventMetaData?.productInfo?.productName;

  switch (activityType) {
    case "IMPORTED":
      return `Imported ${quantity} units of ${packageName}${productName ? ` for product ${productName}` : ""}`;
    case "ACTIVATED":
      return `Activated ${packageName}${productName ? ` for product ${productName}` : ""}`;
    case "DEACTIVATED":
      return `Deactivated ${packageName}`;
    case "FINISHED":
      return `Finished ${packageName}`;
    case "UNFINISHED":
      return `Marked ${packageName} as unfinished`;
    case "DETACHED":
      return `Detached ${packageName} from inventory`;
    default:
      return `${activityType || "Unknown action"} performed on ${packageName}`;
  }
}

function groupLogsByDate(logs: PackageActivityLog[]) {
  return logs.reduce<Record<string, PackageActivityLog[]>>((groups, log) => {
    const date = formatDate(log.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
    return groups;
  }, {});
}

function InfoBox({
  title,
  className,
  rows,
}: {
  title: string;
  className: string;
  rows: Array<[string, React.ReactNode] | false | null | undefined>;
}) {
  const visible = rows.filter(Boolean) as Array<[string, React.ReactNode]>;
  if (visible.length === 0) return null;
  return (
    <div className={`rounded-lg p-3 ${className}`}>
      <h5 className="mb-2 text-sm font-semibold">{title}</h5>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {visible.map(([label, value]) => (
          <div key={label}>
            <span className="font-medium text-muted-foreground">{label}:</span> {value}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionDetails({ meta }: { meta: PackageActivityLog["eventMetaData"] }) {
  if (!meta) return null;
  const rows: Array<{ key: string; text: string }> = [];

  if (meta.detachedBy && meta.detachedAt) {
    rows.push({ key: "detached", text: `Detached by: ${meta.detachedBy} at ${formatDateTime(meta.detachedAt)}` });
  }
  if (meta.continuedBy && meta.continuedAt) {
    rows.push({ key: "continued", text: `Continued by: ${meta.continuedBy} at ${formatDateTime(meta.continuedAt)}` });
  }
  if (meta.attachedBy && meta.attachedAt) {
    rows.push({ key: "attached", text: `Attached by: ${meta.attachedBy} at ${formatDateTime(meta.attachedAt)}` });
  }
  if (meta.discontinuedAt) {
    rows.push({ key: "discontinued", text: `Discontinued at: ${formatDateTime(meta.discontinuedAt)}` });
  }
  if (meta.deactivatedAt) {
    rows.push({ key: "deactivated", text: `Deactivated at: ${formatDateTime(meta.deactivatedAt)}` });
  }
  if (meta.operationType) {
    rows.push({ key: "operation", text: `Operation Type: ${meta.operationType}` });
  }

  if (rows.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {rows.map((r) => (
        <div key={r.key} className="text-xs text-muted-foreground">
          {r.text}
        </div>
      ))}
    </div>
  );
}

function PackageActivityLogCard({
  log,
  expanded,
  onToggle,
}: {
  log: PackageActivityLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { icon: Icon, className: iconClassName } = getActivityIcon(log.activityType);
  const meta = log.eventMetaData;

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
      <div className="flex items-start gap-4 bg-muted/30 p-4">
        <div
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getActivityBadgeClass(
            log.activityType
          )}`}
        >
          <Icon className={`size-3.5 ${iconClassName}`} />
          {log.activityType}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {log.employeeData?.name || "Employee"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{formatTime(log.createdAt)}</span>
              <button
                type="button"
                onClick={onToggle}
                className="text-xs font-medium text-primary hover:underline"
              >
                {expanded ? "Less Details" : "More Details"}
              </button>
            </div>
          </div>

          <p className="mt-1 text-sm font-medium">{getActivityDescription(log)}</p>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div>Quantity: {log.quantity}</div>
            <div>UOM ID: {log.UOMId}</div>
            <div>Package ID: {log.packageId}</div>
            {meta?.packageInfo?.advertisedId && <div>Advertised ID: {meta.packageInfo.advertisedId}</div>}
            {meta?.saleId && (
              <div className="col-span-2">
                <span className="font-medium">Order: </span>
                <a
                  href={`/fulfillment/orders?id=${meta.saleId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {meta.advertisedSaleId || meta.saleId}
                </a>
              </div>
            )}
          </div>

          <ActionDetails meta={meta} />

          {expanded && (
            <div className="mt-4 space-y-3">
              <InfoBox
                title="System Information"
                className="bg-muted/60"
                rows={[
                  ["Log ID", log._id],
                  ["Org ID", log.orgId],
                  ["Shop ID", log.shopId],
                  log.employeeData?.name ? ["Employee Name", log.employeeData.name] : false,
                  ["Employee ID", log.employeeId],
                  ["Created", formatDateTime(log.createdAt)],
                  ["Updated", formatDateTime(log.updatedAt)],
                  log.deletedAt ? ["Deleted", formatDateTime(log.deletedAt)] : false,
                  ["Version", log.__v],
                ]}
              />

              {meta?.packageInfo && (
                <InfoBox
                  title="Package Information"
                  className="bg-blue-50 dark:bg-blue-950/20"
                  rows={[
                    meta.packageInfo.name ? ["Name", meta.packageInfo.name] : false,
                    meta.packageInfo.advertisedId ? ["ID", meta.packageInfo.advertisedId] : false,
                    meta.packageInfo.unitCost != null ? ["Unit Cost", `$${meta.packageInfo.unitCost}`] : false,
                    meta.packageInfo.quantityLeft !== undefined
                      ? ["Quantity Left", meta.packageInfo.quantityLeft]
                      : false,
                    meta.packageInfo.packageType ? ["Type", meta.packageInfo.packageType] : false,
                    meta.packageInfo.source ? ["Source", meta.packageInfo.source] : false,
                    meta.packageInfo.isSample !== undefined
                      ? ["Sample", meta.packageInfo.isSample ? "Yes" : "No"]
                      : false,
                    meta.packageInfo.isImported !== undefined
                      ? ["Imported", meta.packageInfo.isImported ? "Yes" : "No"]
                      : false,
                    meta.packageInfo.wasFinished !== undefined
                      ? ["Was Finished", meta.packageInfo.wasFinished ? "Yes" : "No"]
                      : false,
                    meta.packageInfo.isActive !== undefined
                      ? ["Active", meta.packageInfo.isActive ? "Yes" : "No"]
                      : false,
                    meta.packageInfo.originalBrand ? ["Original Brand", meta.packageInfo.originalBrand] : false,
                    meta.packageInfo.originalCategory
                      ? ["Original Category", meta.packageInfo.originalCategory]
                      : false,
                    meta.packageInfo.manufacturerSKU
                      ? ["Manufacturer SKU", meta.packageInfo.manufacturerSKU]
                      : false,
                    meta.packageInfo.externalBatchId
                      ? ["External Batch ID", meta.packageInfo.externalBatchId]
                      : false,
                  ]}
                />
              )}

              {meta?.productInfo && (
                <InfoBox
                  title="Product Information"
                  className="bg-green-50 dark:bg-green-950/20"
                  rows={[
                    meta.productInfo.productName ? ["Name", meta.productInfo.productName] : false,
                    meta.productInfo.compactName ? ["Compact Name", meta.productInfo.compactName] : false,
                    meta.productInfo.productId ? ["Product ID", meta.productInfo.productId] : false,
                  ]}
                />
              )}

              {meta?.inventoryInfo && (
                <InfoBox
                  title="Inventory Information"
                  className="bg-purple-50 dark:bg-purple-950/20"
                  rows={[
                    meta.inventoryInfo.inventoryId ? ["Inventory ID", meta.inventoryInfo.inventoryId] : false,
                    meta.inventoryInfo.recommendedUnitPrice != null
                      ? ["Recommended Price", `$${meta.inventoryInfo.recommendedUnitPrice}`]
                      : false,
                    meta.inventoryInfo.wasNewInventoryCreated !== undefined
                      ? ["New Inventory Created", meta.inventoryInfo.wasNewInventoryCreated ? "Yes" : "No"]
                      : false,
                    meta.inventoryInfo.wasPackageActivated !== undefined
                      ? ["Package Activated", meta.inventoryInfo.wasPackageActivated ? "Yes" : "No"]
                      : false,
                    meta.inventoryInfo.wasPackageFinished !== undefined
                      ? ["Package Finished", meta.inventoryInfo.wasPackageFinished ? "Yes" : "No"]
                      : false,
                    meta.inventoryInfo.isPackageActivated !== undefined
                      ? ["Is Package Activated", meta.inventoryInfo.isPackageActivated ? "Yes" : "No"]
                      : false,
                    meta.inventoryInfo.hasInventoryAttached !== undefined
                      ? ["Has Inventory Attached", meta.inventoryInfo.hasInventoryAttached ? "Yes" : "No"]
                      : false,
                    meta.inventoryInfo.hadInventoryAttached !== undefined
                      ? ["Had Inventory Attached", meta.inventoryInfo.hadInventoryAttached ? "Yes" : "No"]
                      : false,
                    meta.inventoryInfo.isActive !== undefined
                      ? ["Is Active", meta.inventoryInfo.isActive ? "Yes" : "No"]
                      : false,
                  ]}
                />
              )}

              {meta?.attachmentDetails && (
                <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950/20">
                  <h5 className="mb-2 text-sm font-semibold">Attachment Details</h5>
                  <div className="space-y-2 text-xs">
                    {meta.attachmentDetails.storageLocationBreakdown && (
                      <div>
                        <span className="font-medium text-muted-foreground">Storage Locations:</span>
                        <div className="mt-1 ml-4">
                          {Object.entries(meta.attachmentDetails.storageLocationBreakdown).map(
                            ([locationId, quantity]) => (
                              <div key={locationId} className="text-xs">
                                Location {locationId}: {quantity as number} units
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                    {meta.attachmentDetails.wasStorageLocationCorrupt !== undefined && (
                      <div>
                        <span className="font-medium text-muted-foreground">Storage Location Corrupt:</span>{" "}
                        {meta.attachmentDetails.wasStorageLocationCorrupt ? "Yes" : "No"}
                      </div>
                    )}
                    {meta.attachmentDetails.sellableUoMId && (
                      <div>
                        <span className="font-medium text-muted-foreground">Sellable UoM ID:</span>{" "}
                        {meta.attachmentDetails.sellableUoMId}
                      </div>
                    )}
                    {meta.attachmentDetails.packageActiveStatus !== undefined && (
                      <div>
                        <span className="font-medium text-muted-foreground">Package Active Status:</span>{" "}
                        {meta.attachmentDetails.packageActiveStatus ? "Active" : "Inactive"}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {meta?.updateResults && (
                <InfoBox
                  title="Update Results"
                  className="bg-muted/60"
                  rows={[
                    meta.updateResults.inventoryUpdateSuccess !== undefined
                      ? ["Inventory Update", meta.updateResults.inventoryUpdateSuccess ? "Success" : "Failed"]
                      : false,
                    meta.updateResults.packageUpdateSuccess !== undefined
                      ? ["Package Update", meta.updateResults.packageUpdateSuccess ? "Success" : "Failed"]
                      : false,
                    meta.updateResults.bothUpdatesSuccessful !== undefined
                      ? ["Both Updates", meta.updateResults.bothUpdatesSuccessful ? "Successful" : "Failed"]
                      : false,
                  ]}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PackageActivityLogsV1({ packageId }: { packageId: string }) {
  const { shopId } = useShop();

  const [logs, setLogs] = useState<PackageActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<LegacyFilter>("All");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const filterOptions: LegacyFilter[] = ["All", "Today", "Yesterday", "Custom"];

  useEffect(() => {
    if (!shopId || !packageId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const params: Record<string, any> = {
          shopId,
          packageId,
          page: currentPage,
          limit: PAGE_SIZE,
        };

        if (activeFilter === "Today") {
          const today = new Date().toISOString().split("T")[0];
          params.startDate = today;
          params.endDate = today;
        } else if (activeFilter === "Yesterday") {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];
          params.startDate = yesterdayStr;
          params.endDate = yesterdayStr;
        } else if (activeFilter === "Custom" && customStartDate && customEndDate) {
          params.startDate = customStartDate;
          params.endDate = customEndDate;
        }

        const res = await fetchPackageActivityLogs(params);
        const body = res?.data?.data;
        if (cancelled) return;

        if (body) {
          setLogs(Array.isArray(body.data) ? body.data : []);
          setTotalPages(body.paginationData?.totalPages || 1);
          setTotalEntries(body.paginationData?.totalEntries || 0);
        } else {
          setLogs([]);
          setTotalPages(1);
          setTotalEntries(0);
        }
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err?.message || "Failed to fetch activity logs");
          setLogs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shopId, packageId, activeFilter, customStartDate, customEndDate, currentPage]);

  const toggleExpandLog = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  const groupedLogs = groupLogsByDate(logs);

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Package Activity Logs</h3>
        <span className="text-xs text-muted-foreground">{totalEntries} total entries</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => {
              setActiveFilter(filter);
              setCurrentPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === filter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {activeFilter === "Custom" && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 p-3">
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => {
              setCustomStartDate(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm dark:bg-input/30"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => {
              setCustomEndDate(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm dark:bg-input/30"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center">
          <Clock className="mx-auto mb-3 size-10 text-muted-foreground" />
          <h4 className="text-sm font-medium">No activity logs found</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            No activity has been recorded for this package yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date}>
              <div className="mb-3 inline-block rounded-full bg-muted px-3 py-1 text-sm font-medium">{date}</div>
              <div className="ml-1 space-y-3">
                {dateLogs.map((log) => (
                  <PackageActivityLogCard
                    key={log._id}
                    log={log}
                    expanded={expandedLogs.has(log._id)}
                    onToggle={() => toggleExpandLog(log._id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export interface PackageActivityDrawerProps {
  open: boolean;
  packageId: string;
  onClose: () => void;
}

export default function PackageActivityDrawer({ open, packageId, onClose }: PackageActivityDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} side="right" size={720}>
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Package Activity</h2>
          <Button variant="outline" size="icon" onClick={onClose}>
            <span className="sr-only">Close</span>
            &times;
          </Button>
        </div>

        <Tabs defaultValue="v2" className="flex-1">
          <TabsList>
            <TabsTrigger value="v2">Activity Logs</TabsTrigger>
            <TabsTrigger value="v1">Legacy Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="v2">
            {open && <OverallActivityLogsPanel domain="PACKAGE" targetId={packageId} />}
          </TabsContent>

          <TabsContent value="v1">
            {open && <PackageActivityLogsV1 packageId={packageId} />}
          </TabsContent>
        </Tabs>
      </div>
    </Drawer>
  );
}
