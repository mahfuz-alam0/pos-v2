"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Maximize, Minimize, Download } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchPackagesMinimalExtended } from "@/services/packages/listMinimalExtended";
import { fetchStorageLocations } from "@/services/storageLocations/list";
import { fetchSuppliersList } from "@/services/suppliers/list";
import { fetchLiveAuditSessionCount } from "@/services/auditSessions/count";
import { fetchMyLiveAuditSession } from "@/services/auditSessions/mySession";
import { fetchActiveAuditSessions } from "@/services/auditSessions/listActive";
import { fetchPackageIdsBeingCounted } from "@/services/auditSessions/packageIdsBeingCounted";
import { removeLiveAuditSession as removeLiveAuditSessionApi } from "@/services/auditSessions/removeLiveAuditSession";

import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import CountingModeToggle from "./CountingModeToggle";
import ScanModeBar from "./ScanModeBar";
import AuditFilterBar from "./AuditFilterBar";
import AuditTable from "./AuditTable";
import AdjustPackagesDrawer from "./AdjustPackagesDrawer";
import StartLiveSessionDrawer from "./StartLiveSessionDrawer";
import LiveCartDrawer from "./LiveCartDrawer";
import SessionsListDrawer from "./SessionsListDrawer";
import { exportAuditToCSV, exportAuditToXLS } from "./auditExport";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";
import { buildAuditPdfHtml, getAuditMetadata, AUDIT_PDF_COLUMN_CONFIG, AUDIT_PDF_SECTIONS } from "@/lib/reporting/inventoryAuditPdf";
import { useCurrentUser } from "@/util/use-current-user";
import { useSettings } from "@/context/settings-context";

import type {
  AuditFilters,
  AuditPackageRow,
  LiveAuditSession,
  PendingAdjustment,
  StorageLocation,
  SupplierOption,
} from "./types";

const DEFAULT_FILTERS: AuditFilters = {
  searchText: "",
  searchType: "advertisedIds",
  category: undefined,
  location: undefined,
  brand: undefined,
  supplier: undefined,
  discrepancyFilter: undefined,
  isActiveFilter: true,
  isOutOfStockToggle: false,
};

function expandPackages(packages: AuditPackageRow[], locationFilter?: string | null) {
  return packages.flatMap((pkg) => {
    const breakdown = pkg.storageLocationBreakdown || {};
    const locIds = Object.keys(breakdown);

    if (locationFilter) {
      return [{ ...pkg, rowLocationId: locationFilter, rowLocationQty: breakdown[locationFilter] ?? 0 }];
    }

    if (locIds.length === 0) {
      return [{ ...pkg, rowLocationId: null, rowLocationQty: null }];
    }

    return locIds.map((locId) => ({ ...pkg, rowLocationId: locId, rowLocationQty: breakdown[locId] ?? 0 }));
  });
}

function buildQueryParams(filters: AuditFilters, page: number, limit: number) {
  const params: Record<string, any> = {
    page,
    limit,
    isFinished: false,
    sortByCreatedAt: -1,
  };

  if (filters.searchText) {
    const searchValue = filters.searchText.includes(",")
      ? filters.searchText.split(",").map((s) => s.trim()).filter(Boolean)
      : filters.searchText;
    const searchParamName =
      filters.searchType === "metrcTags" ? "metrcTags" : filters.searchType === "packageName" ? "packageName" : "advertisedIds";
    params[searchParamName] = searchValue;
  }

  if (filters.category) params.productCategoryIds = filters.category;
  if (filters.location) params.storageLocationId = filters.location;
  if (filters.brand) params.productBrandIds = filters.brand;
  if (filters.supplier) params.supplierIds = filters.supplier;
  if (filters.isActiveFilter !== "") params.isActive = filters.isActiveFilter;

  if (filters.discrepancyFilter === "YES") params.hasMETRCDiscrepancy = true;
  else if (filters.discrepancyFilter === "NO") params.hasNoMETRCDiscrepancy = true;

  if (filters.isOutOfStockToggle) params.isInStock = false;

  return params;
}

export default function AuditPage() {
  const { defaultPageSize } = useSettings();
  const router = useRouter();
  const { shopId, shopDetails } = useShop();
  const currentUserId = useCurrentUser()?.id;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AuditPackageRow[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: defaultPageSize, total: 0, totalPages: 1 });

  const [locationMap, setLocationMap] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [fullscreen, setFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"regular" | "live">("regular");
  const [countingMode, setCountingMode] = useState<"manual" | "scan">("manual");

  const [scanCounts, setScanCounts] = useState<Record<string, number>>({});
  const [flashingRows, setFlashingRows] = useState<Record<string, boolean>>({});
  const [scanInput, setScanInput] = useState("");

  const [pendingAdjustments, setPendingAdjustments] = useState<Record<string, PendingAdjustment>>({});
  const [isAdjustDrawerOpen, setIsAdjustDrawerOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [mySession, setMySession] = useState<LiveAuditSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  const [selectedRows, setSelectedRows] = useState<AuditPackageRow[]>([]);
  const [isLiveSessionDrawerOpen, setIsLiveSessionDrawerOpen] = useState(false);
  const [isSelecting200, setIsSelecting200] = useState(false);

  const [filterCountedPackages, setFilterCountedPackages] = useState(false);
  const [countedPackageKeys, setCountedPackageKeys] = useState<Set<string>>(new Set());
  const [countedPackagesLoading, setCountedPackagesLoading] = useState(false);

  const [isSessionsListOpen, setIsSessionsListOpen] = useState(false);
  const [sessionsList, setSessionsList] = useState<LiveAuditSession[]>([]);
  const [sessionsListLoading, setSessionsListLoading] = useState(false);

  const [isLiveCartOpen, setIsLiveCartOpen] = useState(false);
  const [liveCartSession, setLiveCartSession] = useState<LiveAuditSession | null>(null);
  const [liveCartPackages, setLiveCartPackages] = useState<AuditPackageRow[]>([]);

  const [exporting, setExporting] = useState(false);
  const [showPdfDrawer, setShowPdfDrawer] = useState(false);
  const [pdfExportData, setPdfExportData] = useState<AuditPackageRow[]>([]);
  const [pdfMetadata, setPdfMetadata] = useState<any>({});

  const validAdjustments = useMemo(
    () =>
      Object.values(pendingAdjustments).filter(
        (item) => item.newQty !== item.originalQty || (item.metrcQty != null && item.newQty !== item.metrcQty)
      ),
    [pendingAdjustments]
  );

  const fetchFilterOptions = async () => {
    try {
      const [locRes, supRes] = await Promise.all([
        fetchStorageLocations(shopId as string),
        fetchSuppliersList({ limit: 100 }),
      ]);
      const finalLocations: StorageLocation[] = locRes?.data?.data?.locations || [];
      const locMap: Record<string, string> = {};
      finalLocations.forEach((loc: any) => {
        locMap[loc.id || loc._id] = loc.name;
      });
      setLocationMap(locMap);
      setLocations(finalLocations);
      setSuppliers(supRes?.data || []);
    } catch (err) {
      console.error("Error fetching filter options:", err);
    }
  };

  const fetchData = async (page = 1, limit = 100, overrideFilters: AuditFilters | null = null, overrideFilterCounted: boolean | null = null) => {
    setLoading(true);
    try {
      const activeFilters = overrideFilters || filters;
      const params = buildQueryParams(activeFilters, page, limit);

      const shouldFilterCounted = overrideFilterCounted !== null ? overrideFilterCounted : filterCountedPackages;
      if (shouldFilterCounted) {
        try {
          const res = await fetchPackageIdsBeingCounted(shopId as string);
          const keys: string[] = res?.data?.keys || [];
          setCountedPackageKeys(new Set(keys));
          if (keys.length > 0) params.excludedPackageIds = keys;
        } catch {
          // proceed without exclusion if fetch fails
        }
      }

      const res = await fetchPackagesMinimalExtended(shopId as string, params);
      const packages: AuditPackageRow[] = res?.data?.packages || [];
      const paginationData = res?.data?.paginationData || {};

      setData(expandPackages(packages, activeFilters.location));
      setPagination({
        current: paginationData.currentPage || page,
        total: paginationData.totalEntries || 0,
        pageSize: paginationData.limit || limit,
        totalPages: paginationData.totalPages || 1,
      });
    } catch (err) {
      console.error("Error fetching audit packages:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAuditData = async (maxRecords?: number) => {
    const PAGE_SIZE = 100;
    const CONCURRENCY = 5;

    let excludedPackageIds: string[] | undefined;
    if (filterCountedPackages) {
      try {
        const res = await fetchPackageIdsBeingCounted(shopId as string);
        const keys: string[] = res?.data?.keys || [];
        if (keys.length > 0) excludedPackageIds = keys;
      } catch {
        // proceed without exclusion
      }
    }

    const fetchPage = async (page: number) => {
      const params = buildQueryParams(filters, page, PAGE_SIZE);
      if (excludedPackageIds) params.excludedPackageIds = excludedPackageIds;
      const res = await fetchPackagesMinimalExtended(shopId as string, params);
      return {
        packages: (res?.data?.packages || []) as AuditPackageRow[],
        paginationData: res?.data?.paginationData || {},
      };
    };

    const first = await fetchPage(1);
    const totalPages = first.paginationData.totalPages || 1;
    const pagesByNumber = new Map<number, AuditPackageRow[]>([[1, first.packages]]);

    const remainingPages = Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => i + 2);
    for (let i = 0; i < remainingPages.length; i += CONCURRENCY) {
      const batch = remainingPages.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map((page) => fetchPage(page)));
      batch.forEach((page, idx) => pagesByNumber.set(page, results[idx].packages));
    }

    let allData: AuditPackageRow[] = [];
    for (let page = 1; page <= totalPages; page++) {
      allData = allData.concat(expandPackages(pagesByNumber.get(page) || [], filters.location));
      if (maxRecords && allData.length >= maxRecords) break;
    }

    return maxRecords ? allData.slice(0, maxRecords) : allData;
  };

  const fetchSessionInfo = async () => {
    if (!shopId) return;
    setSessionLoading(true);
    try {
      let count = 0;
      let session: LiveAuditSession | null = null;
      try {
        const countRes = await fetchLiveAuditSessionCount(shopId);
        count = countRes?.data?.total ?? 0;
      } catch {}
      try {
        const sessionRes = await fetchMyLiveAuditSession(shopId);
        session = sessionRes?.data?.session ?? null;
      } catch {
        session = null;
      }
      setSessionCount(count);
      setMySession(session);
    } catch (err) {
      console.error("Error fetching audit session info:", err);
    } finally {
      setSessionLoading(false);
    }
  };

  const getSessionTimeRemaining = () => {
    if (!mySession) return null;
    const endTime = mySession.endsAt || mySession.expiresAt || mySession.endTime || mySession.end || mySession.endsAtISO;
    if (!endTime) return null;
    return Math.max(0, Math.round((new Date(endTime).getTime() - Date.now()) / 60000));
  };

  useEffect(() => {
    if (!shopId) return;
    fetchFilterOptions();
    fetchData(1, 100);
    fetchSessionInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  useEffect(() => {
    if (fullscreen) document.body.classList.add("audit-fullscreen");
    else document.body.classList.remove("audit-fullscreen");
    return () => document.body.classList.remove("audit-fullscreen");
  }, [fullscreen]);

  const applyWithFilter = (overrides: Partial<AuditFilters>) => {
    const next = { ...filters, ...overrides };
    setFilters(next);
    fetchData(1, pagination.pageSize, next);
  };

  const handleFilterChange = (patch: Partial<AuditFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    if ("searchText" in patch && patch.searchText === "") {
      applyWithFilter({ searchText: "" });
      return;
    }
    if (!("searchText" in patch)) {
      applyWithFilter(patch);
    }
  };

  const executeReset = () => {
    setIsResetConfirmOpen(false);
    setFilters(DEFAULT_FILTERS);
    setCountingMode("manual");
    setScanCounts({});
    setFlashingRows({});
    setScanInput("");
    fetchData(1, 100, DEFAULT_FILTERS);
  };

  const handleCountingModeChange = (mode: "manual" | "scan") => {
    setCountingMode(mode);
    setScanInput("");
  };

  const stagePendingAdjustment = (found: AuditPackageRow, newCount: number) => {
    let locId = found.rowLocationId || filters.location || null;
    const locIds = Object.keys(found.storageLocationBreakdown || {});
    if (!locId && locIds.length === 1) locId = locIds[0];
    const adjKey = locId ? `${found.id}-${locId}` : `${found.id}`;
    const originalQty = locId ? found.storageLocationBreakdown?.[locId] || 0 : found.quantityLeft || 0;

    setPendingAdjustments((prev) => ({
      ...prev,
      [adjKey]: {
        id: found.id,
        advertisedId: found.advertisedId,
        locationId: locId,
        locationName: locId ? locationMap[locId] : "None",
        productName: found.name,
        originalQty,
        metrcQty: found.metrQuantity ?? null,
        newQty: newCount,
        inputValue: String(newCount),
        uom: found.uoMShortForm || "ea",
        record: found,
      },
    }));
  };

  const handleScan = (rawValue: string) => {
    const trimmed = rawValue?.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    let found = data.find((pkg) => pkg.advertisedId && pkg.advertisedId.toLowerCase() === lower);

    if (!found && trimmed.length >= 5) {
      const last5 = lower.slice(-5);
      found = data.find((pkg) => pkg.advertisedId && pkg.advertisedId.toLowerCase().slice(-5) === last5);
    }

    if (found) {
      const rowKey = found.rowLocationId ? `${found.id}-${found.rowLocationId}` : `${found.id}`;
      const newCount = (scanCounts[found.advertisedId || ""] || 0) + 1;

      setScanCounts((prev) => ({ ...prev, [found!.advertisedId || ""]: newCount }));
      stagePendingAdjustment(found, newCount);

      setFlashingRows((prev) => ({ ...prev, [rowKey]: true }));
      setTimeout(() => {
        setFlashingRows((prev) => {
          const next = { ...prev };
          delete next[rowKey];
          return next;
        });
      }, 1400);

      toast.success(`✓ ${found.name || found.advertisedId} — Count: ${newCount}`);
    } else {
      toast.warning(`Package not found in current view: "${trimmed}"`);
    }

    setScanInput("");
  };

  const handleClearScanCounts = () => {
    setScanCounts({});
    setFlashingRows({});
    setPendingAdjustments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k]?.inputValue && scanCounts[next[k]?.advertisedId || ""] !== undefined) {
          delete next[k];
        }
      });
      return next;
    });
  };

  const handleQtyChange = (val: string, record: AuditPackageRow, locId: string | null) => {
    const key = locId ? `${record.id}-${locId}` : `${record.id}`;
    const originalQty = locId ? record.storageLocationBreakdown?.[locId] || 0 : record.quantityLeft || 0;

    if (val === "" || isNaN(parseFloat(val))) {
      setPendingAdjustments((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      setPendingAdjustments((prev) => ({
        ...prev,
        [key]: {
          id: record.id,
          advertisedId: record.advertisedId,
          locationId: locId,
          locationName: locId ? locationMap[locId] : "None",
          productName: record.name,
          originalQty,
          metrcQty: record.metrQuantity ?? null,
          newQty: parseFloat(val),
          inputValue: val,
          uom: record.uoMShortForm || "ea",
          record,
        },
      }));
    }
  };

  const handleRemoveAdjustment = (key: string) => {
    setPendingAdjustments((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSelect200 = async () => {
    setIsSelecting200(true);
    try {
      const allData = await fetchAllAuditData(200);
      const toSelect = allData.slice(0, 200);
      const keys = toSelect.map((r) => (r.rowLocationId ? `${r.id}-${r.rowLocationId}` : r.id));
      setSelectedRowKeys(keys);
      setSelectedRows(toSelect);
    } catch {
      toast.error("Failed to select packages");
    } finally {
      setIsSelecting200(false);
    }
  };

  const handleFilterCountedToggle = (checked: boolean) => {
    setFilterCountedPackages(checked);
    fetchData(1, pagination.pageSize, null, checked);
  };

  const fetchSessionsList = async () => {
    if (!shopId) return;
    setSessionsListLoading(true);
    try {
      const res = await fetchActiveAuditSessions(shopId);
      setSessionsList(res?.data?.sessions || []);
    } catch {
      setSessionsList([]);
    } finally {
      setSessionsListLoading(false);
    }
  };

  const handleOpenSessionsList = () => {
    setIsSessionsListOpen(true);
    fetchSessionsList();
  };

  const handleOpenLiveCart = (session: LiveAuditSession) => {
    const sessionPackageIds = new Set(Object.keys(session.countKV || {}).filter((k) => k !== "string"));
    const matched = data.filter((r) => sessionPackageIds.has(r.id) || sessionPackageIds.has(r.advertisedId || ""));
    setLiveCartSession(session);
    setLiveCartPackages(matched);
    setIsLiveCartOpen(true);
  };

  const handleExport = async (type: "csv" | "xls" | "pdf") => {
    if (!data || data.length === 0) {
      toast.warning("No data available to export");
      return;
    }
 
    setExporting(true);
    try {
      if (type === "csv") {
        const allData = await fetchAllAuditData();
        exportAuditToCSV(allData, locationMap);
        toast.success("CSV file downloaded successfully!");
      } else if (type === "xls") {
        const allData = await fetchAllAuditData();
        exportAuditToXLS(allData, locationMap);
        toast.success("Excel file downloaded successfully!");
      } else if (type === "pdf") {
        const allData = await fetchAllAuditData();
        if (allData.length > 0) {
          setPdfExportData(allData);
          setPdfMetadata(getAuditMetadata(shopDetails, allData.length));
          setShowPdfDrawer(true);
        }
      }
    } catch (err) {
      console.error(`Error exporting to ${type}:`, err);
      toast.error(`Failed to export to ${type.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={fullscreen ? "fixed inset-0 z-2000 overflow-y-auto bg-background p-6" : "flex flex-col gap-4 p-6"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/inventory-management">Inventory Management</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Audit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg bg-muted p-0.5">
            {(["regular", "live"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-[7px] px-3 py-1 text-sm capitalize transition-colors ${viewMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"}`}
              >
                {mode}
              </button>
            ))}
          </div>

          <CountingModeToggle value={countingMode} onChange={handleCountingModeChange} />

          {validAdjustments.length > 0 && (
            <Button className="bg-green-600 font-semibold hover:bg-green-700" onClick={() => setIsAdjustDrawerOpen(true)}>
              Adjust ({validAdjustments.length})
            </Button>
          )}

          <div className="mx-1 h-6 w-px bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" disabled={!data || data.length === 0 || exporting} />}>
              <Download className="size-4" />
              Export
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("csv")}>Export to CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("xls")}>Export to Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>Export to PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
            <AlertDialogTrigger>
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Filters</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to reset all filters?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={executeReset}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {viewMode === "live" && !sessionLoading && sessionCount !== null && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenSessionsList}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  sessionCount > 0
                    ? "border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                <span className={`size-2 rounded-full ${sessionCount > 0 ? "bg-yellow-500" : "bg-muted-foreground"}`} />
                {sessionCount} session{sessionCount !== 1 ? "s" : ""} in progress
              </button>

              {mySession ? (
                <Button
                  className="bg-green-500 hover:bg-green-600"
                  onClick={() => router.push(`/inventory-management/audit/${mySession.id}`)}
                >
                  Go to Live Count Session
                  {getSessionTimeRemaining() !== null && ` (${getSessionTimeRemaining()} min left)`}
                </Button>
              ) : (
                selectedRowKeys.length > 0 && (
                  <Button disabled={!filters.location} onClick={() => setIsLiveSessionDrawerOpen(true)}>
                    Start Live Count Session ({selectedRowKeys.length})
                  </Button>
                )
              )}
            </div>
          )}

          <Button variant="outline" size="icon" onClick={() => setFullscreen((f) => !f)}>
            {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </Button>
        </div>
      </div>

      <AuditFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        locations={locations}
        suppliers={suppliers}
        filterCountedPackages={filterCountedPackages}
        countedPackagesLoading={countedPackagesLoading}
        countedPackageCount={countedPackageKeys.size}
        onFilterCountedToggle={handleFilterCountedToggle}
        viewMode={viewMode}
      />

      {countingMode === "scan" && (
        <ScanModeBar
          value={scanInput}
          onChange={setScanInput}
          onScan={handleScan}
          scanCounts={scanCounts}
          onClear={handleClearScanCounts}
        />
      )}

      {(viewMode === "live" || selectedRowKeys.length > 0) && (
        <div className="flex items-center gap-2">
          {viewMode === "live" && (
            <Button size="sm" variant="outline" onClick={handleSelect200} disabled={data.length === 0 || isSelecting200}>
              {isSelecting200 ? "Selecting..." : "Select 200 Packages"}
            </Button>
          )}
          {selectedRowKeys.length > 0 && (
            <>
              <span className="text-xs font-semibold text-blue-600">
                {selectedRowKeys.length} package{selectedRowKeys.length !== 1 ? "s" : ""} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedRowKeys([]);
                  setSelectedRows([]);
                }}
              >
                Clear
              </Button>
            </>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <AuditTable
          data={data}
          loading={loading || countedPackagesLoading}
          locationMap={locationMap}
          locationFilter={filters.location}
          countingMode={countingMode}
          scanCounts={scanCounts}
          flashingRows={flashingRows}
          pendingAdjustments={pendingAdjustments}
          onQtyChange={handleQtyChange}
          selectable={viewMode === "live"}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={(keys, rows) => {
            setSelectedRowKeys(keys);
            setSelectedRows((prev) => {
              const rowMap = new Map<string, AuditPackageRow>(
                prev.map((r) => [r.rowLocationId ? `${r.id}-${r.rowLocationId}` : String(r.id), r])
              );
              rows.forEach((r) => rowMap.set(r.rowLocationId ? `${r.id}-${r.rowLocationId}` : String(r.id), r));
              return keys.map((k) => rowMap.get(String(k))).filter(Boolean) as AuditPackageRow[];
            });
          }}
        />
      </div>

      {countingMode !== "scan" && (
        <TablePagination
          page={pagination.current}
          totalPages={pagination.totalPages}
          totalEntries={pagination.total}
          pageSize={pagination.pageSize}
          loading={loading}
          onPageChange={(p: number) => fetchData(p, pagination.pageSize)}
          pageSizeOptions={[30, 50, 100, 200]}
          onPageSizeChange={(s) => fetchData(1, s)}
        />
      )}

      <AdjustPackagesDrawer
        open={isAdjustDrawerOpen}
        onClose={() => setIsAdjustDrawerOpen(false)}
        validAdjustments={validAdjustments}
        onRemove={handleRemoveAdjustment}
        onCompleted={() => {
          setPendingAdjustments({});
          setIsAdjustDrawerOpen(false);
          fetchData(1, pagination.pageSize);
        }}
      />

      <StartLiveSessionDrawer
        open={isLiveSessionDrawerOpen}
        onClose={() => setIsLiveSessionDrawerOpen(false)}
        selectedRows={selectedRows}
        locationMap={locationMap}
        locationId={filters.location}
        onCreated={() => {
          setIsLiveSessionDrawerOpen(false);
          setSelectedRowKeys([]);
          setSelectedRows([]);
          fetchSessionInfo();
        }}
      />

      <SessionsListDrawer
        open={isSessionsListOpen}
        onClose={() => setIsSessionsListOpen(false)}
        sessions={sessionsList}
        loading={sessionsListLoading}
        locationMap={locationMap}
        onRefresh={fetchSessionsList}
        currentUserId={currentUserId}
        onDismissed={() => {
          fetchSessionInfo();
          fetchData(pagination.current, pagination.pageSize);
          if (filterCountedPackages) fetchData(pagination.current, pagination.pageSize, null, true);
        }}
      />

      <LiveCartDrawer
        open={isLiveCartOpen}
        onClose={() => setIsLiveCartOpen(false)}
        session={liveCartSession}
        packages={liveCartPackages}
        locationMap={locationMap}
        locations={locations}
        suppliers={suppliers}
        countedPackageKeys={countedPackageKeys}
        pendingAdjustments={pendingAdjustments}
        onQtyChange={handleQtyChange}
        onScanMatch={stagePendingAdjustment}
      />

      <PdfExportDrawer
        open={showPdfDrawer}
        onClose={() => setShowPdfDrawer(false)}
        data={pdfExportData}
        metadata={pdfMetadata}
        availableSections={AUDIT_PDF_SECTIONS}
        htmlGenerator={buildAuditPdfHtml}
        columnConfig={AUDIT_PDF_COLUMN_CONFIG}
      />
    </div>
  );
}
