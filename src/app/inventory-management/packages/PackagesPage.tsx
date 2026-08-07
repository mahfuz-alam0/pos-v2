"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Loader2, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { useDebounce } from "@/hooks/useDebounce";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { fetchPackagesMinimalExtended } from "@/services/packages/listMinimalExtended";
import { fetchArchivedPackages } from "@/services/packages/listArchived";
import { fetchSinglePackage } from "@/services/packages/getSingle";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchStorageLocations } from "@/services/storageLocations/list";
import { fetchInventoryCleanupRecord } from "@/services/inventoryCleanup/getRecord";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiSelect } from "@/components/ui/api-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";

import { Checkbox } from "@/components/ui/checkbox";

import PackageDetailsPanel from "./PackageDetailsPanel";
import RepackageDrawer from "./RepackageDrawer";
import WasteDrawer from "./WasteDrawer";
import BulkFinishDrawer from "./BulkFinishDrawer";
import BulkUploadDrawer from "./BulkUploadDrawer";
import ReconcilePackageDrawer from "./ReconcilePackageDrawer";
import { CleanupPackagesDrawer, CleanupPreferencesDrawer } from "./CleanupDrawer";
import { exportPackagesToCSV, exportPackagesToXLS } from "./packagesExport";
import type { BrandOption, CategoryOption, PackageFilters, PackageRow, PackageTab, StorageLocationOption } from "./types";

const DEFAULT_FILTERS: PackageFilters = {
  searchText: "",
  searchType: "advertisedIds",
};

const TAB_OPTIONS: { value: PackageTab; label: string }[] = [
  { value: "unFinish", label: "Live Packages" },
  { value: "finishPackages", label: "Finish Packages" },
  { value: "finishedPackages", label: "Finished Packages" },
  { value: "conversions", label: "Conversions" },
  { value: "archived", label: "Archived Packages" },
];

function fmtDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ageInDays(value?: string) {
  if (!value) return "-";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  return `${days}d`;
}

function buildQueryParams(tab: PackageTab, filters: PackageFilters, page: number, limit: number) {
  const params: Record<string, any> = { page, limit, sortByCreatedAt: -1 };

  if (tab === "unFinish") params.isFinished = false;
  else if (tab === "finishPackages") {
    params.isFinished = false;
    params.shouldRequiredToBeFinished = true;
  } else if (tab === "finishedPackages") params.isFinished = true;
  else if (tab === "conversions") {
    params.isConverted = true;
    params.isFinished = false;
  }

  if (filters.searchText) {
    const searchValue = filters.searchText.includes(",")
      ? filters.searchText.split(",").map((s) => s.trim()).filter(Boolean)
      : filters.searchText;
    const paramName =
      filters.searchType === "metrcTags" ? "metrcTags" : filters.searchType === "packageName" ? "packageName" : "advertisedIds";
    params[paramName] = searchValue;
  }

  if (filters.productCategoryIds) params.productCategoryIds = filters.productCategoryIds;
  if (filters.productBrandIds) params.productBrandIds = filters.productBrandIds;
  if (filters.storageLocationId) params.storageLocationId = filters.storageLocationId;
  if (filters.discrepancyFilter === "YES") params.hasMETRCDiscrepancy = true;
  else if (filters.discrepancyFilter === "NO") params.hasNoMETRCDiscrepancy = true;
  if (filters.source) params.source = filters.source;
  if (filters.packageStatus === "pendingImport") params.isImported = false;
  else if (filters.packageStatus) params[filters.packageStatus] = true;
  if (filters.productProfile) params.packageType = filters.productProfile;
  if (filters.lastUpdatedWithinDays) params.lastUpdatedWithinDays = filters.lastUpdatedWithinDays;
  if (filters.lastManuallyAdjustedWithinDays) params.lastManuallyAdjustedWithinDays = filters.lastManuallyAdjustedWithinDays;

  return params;
}

export default function PackagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shopId } = useShop();
  const metrcMechanism = useFeatureAccess();
  const openId = searchParams.get("id");

  const [userInfo, setUserInfo] = useState<{ orgFeatureScopes?: string[]; type?: string } | null>(null);
  useEffect(() => {
    try {
      setUserInfo(JSON.parse(localStorage.getItem("userInfo") || "null"));
    } catch {
      setUserInfo(null);
    }
  }, []);

  const shouldPopulateMetrcData =
    Boolean(userInfo?.orgFeatureScopes?.includes("METRC_REPORTING")) ||
    userInfo?.type === "SUPER_ADMIN" ||
    userInfo?.type === "ADMINISTRATION";
  const isAdmin = userInfo?.type === "SUPER_ADMIN" || userInfo?.type === "ADMINISTRATION";

  const [tab, setTab] = useState<PackageTab>("unFinish");
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [archivedRows, setArchivedRows] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 100, total: 0, totalPages: 1 });

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [locations, setLocations] = useState<StorageLocationOption[]>([]);
  const [locationMap, setLocationMap] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<PackageFilters>(DEFAULT_FILTERS);
  const debouncedSearchText = useDebounce(filters.searchText, 300);
  const [showLastUpdated, setShowLastUpdated] = useState(false);
  const [showLastAdjusted, setShowLastAdjusted] = useState(false);

  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeSearching, setBarcodeSearching] = useState(false);
  const barcodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  const [selectedRows, setSelectedRows] = useState<PackageRow[]>([]);

  const [repackageOpen, setRepackageOpen] = useState(false);
  const [wasteOpen, setWasteOpen] = useState(false);
  const [bulkFinishOpen, setBulkFinishOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const [reconcileDetail, setReconcileDetail] = useState<any>(null);
  const [reconcileLoadingId, setReconcileLoadingId] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [cleanupPackageIds, setCleanupPackageIds] = useState<string[]>([]);
  const [cleanupViewOpen, setCleanupViewOpen] = useState(false);
  const [cleanupPrefsOpen, setCleanupPrefsOpen] = useState(false);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const [catRes, brandRes, locRes] = await Promise.all([
        fetchCategoriesList({ limit: 100 } as any),
        fetchBrandsList({ limit: 100 } as any),
        fetchStorageLocations(shopId as string),
      ]);
      setCategories((catRes?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })));
      setBrands((brandRes?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })));
      const locs: StorageLocationOption[] = locRes?.data?.data?.locations ?? [];
      setLocations(locs);
      const map: Record<string, string> = {};
      locs.forEach((l: any) => (map[l.id || l._id] = l.name));
      setLocationMap(map);
    } catch {
      // non-critical
    }
  }, [shopId]);

  const loadPackages = useCallback(
    async (page = 1, limit = pagination.pageSize) => {
      if (!shopId) return;
      setLoading(true);
      try {
        if (tab === "archived") {
          const res = await fetchArchivedPackages(shopId as string, { page, limit });
          const list = res?.data?.data?.packages ?? [];
          setArchivedRows(list);
          const pd = res?.data?.data?.paginationData ?? {};
          setPagination({
            current: pd.currentPage ?? page,
            total: pd.totalEntries ?? list.length,
            pageSize: pd.limit ?? limit,
            totalPages: pd.totalPages ?? 1,
          });
        } else {
          const params = buildQueryParams(tab, { ...filters, searchText: debouncedSearchText }, page, limit);
          const res = await fetchPackagesMinimalExtended(shopId as string, params);
          const list = res?.data?.packages ?? [];
          setRows(list);
          const pd = res?.data?.paginationData ?? {};
          setPagination({
            current: pd.currentPage ?? page,
            total: pd.totalEntries ?? list.length,
            pageSize: pd.limit ?? limit,
            totalPages: pd.totalPages ?? 1,
          });
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load packages");
      } finally {
        setLoading(false);
      }
    },
    [shopId, tab, filters, debouncedSearchText, pagination.pageSize]
  );

  useEffect(() => {
    if (!shopId) return;
    fetchFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  useEffect(() => {
    loadPackages(1, pagination.pageSize);
    setSelectedRowKeys([]);
    setSelectedRows([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, tab, filters.productCategoryIds, filters.productBrandIds, filters.storageLocationId, filters.discrepancyFilter, filters.source, filters.packageStatus, filters.productProfile, filters.lastUpdatedWithinDays, filters.lastManuallyAdjustedWithinDays, debouncedSearchText]);

  const loadCleanupRecord = useCallback(() => {
    if (!shopId) return;
    fetchInventoryCleanupRecord(shopId as string)
      .then((res) => setCleanupPackageIds(res?.data?.data?.stagedPackageIds ?? []))
      .catch(() => setCleanupPackageIds([]));
  }, [shopId]);

  useEffect(() => {
    loadCleanupRecord();
  }, [loadCleanupRecord]);

  const handleBarcodeSearch = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || !shopId) {
        setBarcodeSearching(false);
        return;
      }
      setBarcodeSearching(true);
      try {
        const res = await fetchPackagesMinimalExtended(shopId as string, { limit: 1, page: 1, advertisedIds: trimmed });
        const pkg = res?.data?.packages?.[0] ?? (await fetchPackagesMinimalExtended(shopId as string, { limit: 1, page: 1, metrcTags: trimmed }))?.data?.packages?.[0];
        if (pkg) openRow(pkg.id);
        else toast.error("No package found with this barcode");
      } catch (err: any) {
        toast.error(err?.message || "Failed to search package");
      } finally {
        setBarcodeSearching(false);
        setBarcodeInput("");
      }
    },
    [shopId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onBarcodeChange = (value: string) => {
    setBarcodeInput(value);
    if (barcodeDebounceRef.current) clearTimeout(barcodeDebounceRef.current);
    barcodeDebounceRef.current = setTimeout(() => handleBarcodeSearch(value), 500);
  };

  const activeRows = tab === "archived" ? archivedRows : rows;

  const isRowSelected = (rowId: string | number) => selectedRowKeys.includes(rowId);

  const toggleRow = (row: PackageRow, checked: boolean) => {
    setSelectedRowKeys((prev) => (checked ? [...prev, row.id] : prev.filter((k) => k !== row.id)));
    setSelectedRows((prev) => (checked ? [...prev, row] : prev.filter((r) => r.id !== row.id)));
  };

  const toggleAllRows = (checked: boolean) => {
    setSelectedRowKeys(checked ? activeRows.map((r) => r.id) : []);
    setSelectedRows(checked ? activeRows : []);
  };

  const isCaliforniaState = typeof window !== "undefined" && localStorage.getItem("isCaliforniaState") === "true";
  const selectedMetrcRows = selectedRows.filter((r) => r.source === "METRC" && (r.quantityLeft ?? 0) > 0);
  const selectedTransferRows = selectedRows.filter(
    (r) => r.storageLocationBreakdown && Object.keys(r.storageLocationBreakdown).length > 0
  );

  const openRow = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", id);
    router.push(`/inventory-management/packages?${params.toString()}`, { scroll: false });
  };

  const closeDetail = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    router.push(`/inventory-management/packages${params.toString() ? `?${params}` : ""}`, { scroll: false });
  };

  const openReconcile = async (id: string) => {
    if (!shopId) return;
    setReconcileLoadingId(id);
    try {
      const res = await fetchSinglePackage(shopId as string, { id });
      const pkg = res?.data?.data?.package ?? res?.data?.data ?? null;
      if (!pkg) {
        toast.error("Failed to load package details");
        return;
      }
      setReconcileDetail(pkg);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load package details");
    } finally {
      setReconcileLoadingId(null);
    }
  };

  const handleClearFilter = (key: keyof PackageFilters) => {
    setFilters((prev) => ({ ...prev, [key]: key === "searchText" ? "" : undefined }));
    if (key === "lastUpdatedWithinDays") setShowLastUpdated(false);
    if (key === "lastManuallyAdjustedWithinDays") setShowLastAdjusted(false);
  };

  const hasActiveFilters =
    filters.searchText ||
    filters.productCategoryIds ||
    filters.productBrandIds ||
    filters.storageLocationId ||
    filters.discrepancyFilter ||
    filters.source ||
    filters.packageStatus ||
    filters.productProfile ||
    filters.lastUpdatedWithinDays ||
    filters.lastManuallyAdjustedWithinDays;

  const activeFilterChips = useMemo(() => {
    const chips: { key: keyof PackageFilters; label: string }[] = [];
    if (filters.searchText) chips.push({ key: "searchText", label: `Search: ${filters.searchText}` });
    if (filters.productCategoryIds) {
      const c = categories.find((c) => c.id === filters.productCategoryIds);
      chips.push({ key: "productCategoryIds", label: `Category: ${c?.name ?? filters.productCategoryIds}` });
    }
    if (filters.productBrandIds) {
      const b = brands.find((b) => b.id === filters.productBrandIds);
      chips.push({ key: "productBrandIds", label: `Brand: ${b?.name ?? filters.productBrandIds}` });
    }
    if (filters.storageLocationId) {
      chips.push({ key: "storageLocationId", label: `Location: ${locationMap[filters.storageLocationId] ?? filters.storageLocationId}` });
    }
    if (filters.discrepancyFilter) chips.push({ key: "discrepancyFilter", label: `METRC Discrepancy: ${filters.discrepancyFilter}` });
    if (filters.source) chips.push({ key: "source", label: `Source: ${filters.source === "PLATFORM" ? "POS" : "METRC"}` });
    if (filters.packageStatus) {
      const statusLabel = filters.packageStatus === "pendingImport" ? "Pending Import" : filters.packageStatus;
      chips.push({ key: "packageStatus", label: `Status: ${statusLabel}` });
    }
    if (filters.productProfile) chips.push({ key: "productProfile", label: `Type: ${filters.productProfile}` });
    if (filters.lastUpdatedWithinDays) chips.push({ key: "lastUpdatedWithinDays", label: `Active within ${filters.lastUpdatedWithinDays}d` });
    if (filters.lastManuallyAdjustedWithinDays) chips.push({ key: "lastManuallyAdjustedWithinDays", label: `Adjusted within ${filters.lastManuallyAdjustedWithinDays}d` });
    return chips;
  }, [filters, categories, brands, locationMap]);

  const fetchAllPackagesData = async () => {
    if (pagination.totalPages <= 1) return activeRows;
    let all: PackageRow[] = [];
    for (let p = 1; p <= pagination.totalPages; p++) {
      try {
        const params = buildQueryParams(tab, filters, p, pagination.pageSize);
        const res = await fetchPackagesMinimalExtended(shopId as string, params);
        all = all.concat(res?.data?.packages ?? []);
      } catch {
        toast.warning(`Failed to fetch page ${p}, continuing`);
      }
    }
    return all;
  };

  const handleExport = async (type: "csv" | "xls") => {
    if (!activeRows.length) return toast.warning("No data available to export");
    setExporting(true);
    try {
      const allData = await fetchAllPackagesData();
      if (type === "csv") exportPackagesToCSV(allData);
      else exportPackagesToXLS(allData);
      toast.success(`${type.toUpperCase()} exported successfully (${allData.length} records)`);
    } catch {
      toast.error(`Failed to export ${type.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  const showMetrcQtyColumn = shouldPopulateMetrcData;

  return (
    <div className="flex gap-4 p-3">
      <div className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card px-4 py-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/inventory-management">Inventory Management</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-primary">Packages</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">
            {selectedRowKeys.length > 0 && (
              <Badge variant="outline" className="gap-1.5 border-blue-200 bg-blue-50 py-1 pr-1 pl-2.5 font-normal text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400">
                {selectedRowKeys.length} package{selectedRowKeys.length !== 1 ? "s" : ""} selected
                <button
                  onClick={() => {
                    setSelectedRowKeys([]);
                    setSelectedRows([]);
                  }}
                  className="rounded-full hover:bg-blue-100 dark:hover:bg-blue-900"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {selectedRowKeys.length > 0 && !isCaliforniaState && (
              <Button
                className="h-9! rounded! px-3.5! text-[14px]! font-normal! text-muted-foreground!"
                variant="outline"
                onClick={() => setWasteOpen(true)}
              >
                Assign New Waste Tag ({selectedRowKeys.length})
              </Button>
            )}

            {selectedMetrcRows.length > 0 && (
              <Button className="h-9! rounded! px-3.5! text-[14px]! font-medium!" onClick={() => setRepackageOpen(true)}>
                Repackage ({selectedMetrcRows.length})
              </Button>
            )}

            {selectedTransferRows.length > 0 && (
              <Button
                className="h-9! rounded! px-3.5! text-[14px]! font-medium!"
                variant="outline"
                onClick={() =>
                  router.push(
                    `/inventory-management/transfers/add-transfer?transferType=within-storage-locations&packageIds=${selectedTransferRows
                      .map((r) => r.id)
                      .join(",")}`
                  )
                }
              >
                Transfer ({selectedTransferRows.length})
              </Button>
            )}

            {selectedRowKeys.length > 0 && tab === "finishPackages" && (
              <Button className="h-9! rounded! px-3.5! text-[14px]! font-medium!" variant="outline" onClick={() => setBulkFinishOpen(true)}>
                Bulk Finish ({selectedRowKeys.length})
              </Button>
            )}

            {cleanupPackageIds.length > 0 && (
              <button
                type="button"
                onClick={() => setCleanupViewOpen(true)}
                className="cursor-pointer"
              >
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
                  {cleanupPackageIds.length} packages need cleanup
                </Badge>
              </button>
            )}

            {isAdmin && (
              <Button
                className="h-9! rounded! px-3.5! text-[14px]! font-medium!"
                variant="outline"
                onClick={() => setCleanupPrefsOpen(true)}
              >
                Cleanup Preferences
              </Button>
            )}

            {shouldPopulateMetrcData ? (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button className="h-9! rounded! px-3.5! text-[14px]! font-medium!">Add</Button>} />
                <DropdownMenuContent>
                  <DropdownMenuItem render={<Link href="/inventory-management/packages/add" />}>Create Regular Package</DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/inventory-management/packages/import-metrc" />}>Import From METRC</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button className="h-9! rounded! px-3.5! text-[14px]! font-medium!" render={<Link href="/inventory-management/packages/add" />}>
                Add Package
              </Button>
            )}

            <Button className="h-9! rounded! px-3.5! text-[14px]! font-medium!" onClick={() => setBulkUploadOpen(true)}>
              Bulk Package Upload
            </Button>
          </div>
        </div>

        {tab !== "archived" && (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-60">
                <Input
                  placeholder="Scan via barcode"
                  value={barcodeInput}
                  onChange={(e) => onBarcodeChange(e.target.value)}
                  className={`h-10 placeholder:text-muted-foreground/60 ${barcodeSearching ? "pr-8" : ""}`}
                />
                {barcodeSearching && (
                  <Loader2 className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="Search By.."
                  className="h-10 placeholder:text-muted-foreground/60"
                  style={{ width: 240 }}
                  value={filters.searchText}
                  onChange={(e) => setFilters((prev) => ({ ...prev, searchText: e.target.value }))}
                />
                <Select
                  items={[
                    { value: "advertisedIds", label: "Package ID" },
                    { value: "metrcTags", label: "Metrc Tag" },
                    { value: "packageName", label: "Package Name" },
                  ]}
                  value={filters.searchType}
                  onValueChange={(v) => setFilters((prev) => ({ ...prev, searchType: v as PackageFilters["searchType"] }))}
                >
                  <SelectTrigger className="h-10! w-36">
                    <SelectValue className="text-muted-foreground/60" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advertisedIds">Package ID</SelectItem>
                    <SelectItem value="metrcTags">Metrc Tag</SelectItem>
                    <SelectItem value="packageName">Package Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ApiSelect
                placeholder="Select Brand"
                value={filters.productBrandIds ?? null}
                onChange={(val) => setFilters((prev) => ({ ...prev, productBrandIds: (val as string) ?? undefined }))}
                fetchPage={async (page, search) => {
                  const res = await fetchBrandsList({ page, limit: 20, ...(search ? { search } : {}) } as any);
                  return { items: (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
                }}
                triggerClassName="h-10 w-44 [&_.text-muted-foreground]:text-muted-foreground/60"
              />

              <ApiSelect
                placeholder="Select Category"
                value={filters.productCategoryIds ?? null}
                onChange={(val) => setFilters((prev) => ({ ...prev, productCategoryIds: (val as string) ?? undefined }))}
                fetchPage={async (page, search) => {
                  const res = await fetchCategoriesList({ page, limit: 20, ...(search ? { search } : {}) } as any);
                  return { items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
                }}
                triggerClassName="h-10 w-44 [&_.text-muted-foreground]:text-muted-foreground/60"
              />

              <Select
                items={[{ value: "__all__", label: "All Locations" }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
                value={filters.storageLocationId ?? "__all__"}
                onValueChange={(v) => setFilters((prev) => ({ ...prev, storageLocationId: v === "__all__" ? undefined : (v as string) }))}
              >
                <SelectTrigger className="h-10! w-48">
                  <SelectValue className="text-muted-foreground/60" placeholder="Storage Locations">
                    {(value: string) =>
                      value === "__all__" ? "Storage Locations" : locations.find((l) => l.id === value)?.name ?? "Storage Locations"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Locations</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                items={[
                  { value: "__all__", label: "All" },
                  { value: "YES", label: "Has METRC Discrepancy" },
                  { value: "NO", label: "No METRC Discrepancy" },
                ]}
                value={filters.discrepancyFilter ?? "__all__"}
                onValueChange={(v) => setFilters((prev) => ({ ...prev, discrepancyFilter: v === "__all__" ? undefined : (v as "YES" | "NO") }))}
              >
                <SelectTrigger className="h-10! w-52">
                  <SelectValue className="text-muted-foreground/60" placeholder="Metrc Discrepancy">
                    {(value: string) =>
                      value === "__all__" ? "Metrc Discrepancy" : value === "YES" ? "Has METRC Discrepancy" : "No METRC Discrepancy"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="YES">Has METRC Discrepancy</SelectItem>
                  <SelectItem value="NO">No METRC Discrepancy</SelectItem>
                </SelectContent>
              </Select>

              <Select
                items={[
                  { value: "__all__", label: "All" },
                  { value: "PLATFORM", label: "POS (Point of Sale)" },
                  { value: "METRC", label: "METRC" },
                ]}
                value={filters.source ?? "__all__"}
                onValueChange={(v) => setFilters((prev) => ({ ...prev, source: v === "__all__" ? undefined : (v as "PLATFORM" | "METRC") }))}
              >
                <SelectTrigger className="h-10! w-36">
                  <SelectValue className="text-muted-foreground/60" placeholder="Source">
                    {(value: string) =>
                      value === "__all__" ? "Source" : value === "PLATFORM" ? "POS (Point of Sale)" : "METRC"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="PLATFORM">POS (Point of Sale)</SelectItem>
                  <SelectItem value="METRC">METRC</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  className="h-9! rounded! px-3.5! text-[14px]! font-medium!"
                  variant="outline"
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    setShowLastUpdated(false);
                    setShowLastAdjusted(false);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                items={[
                  { value: "__all__", label: "All" },
                  { value: "isImported", label: "Imported" },
                  { value: "isExpired", label: "Expired" },
                  { value: "isSample", label: "Sample" },
                  { value: "isActive", label: "Active" },
                  { value: "pendingImport", label: "Pending Import" },
                ]}
                value={filters.packageStatus ?? "__all__"}
                onValueChange={(v) => setFilters((prev) => ({ ...prev, packageStatus: v === "__all__" ? undefined : (v as PackageFilters["packageStatus"]) }))}
              >
                <SelectTrigger className="h-10! w-44">
                  <SelectValue className="text-muted-foreground/60" placeholder="Package Status">
                    {(value: string) => {
                      const labels: Record<string, string> = {
                        __all__: "Package Status",
                        isImported: "Imported",
                        isExpired: "Expired",
                        isSample: "Sample",
                        isActive: "Active",
                        pendingImport: "Pending Import",
                      };
                      return labels[value] ?? "Package Status";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="isImported">Imported</SelectItem>
                  <SelectItem value="isExpired">Expired</SelectItem>
                  <SelectItem value="isSample">Sample</SelectItem>
                  <SelectItem value="isActive">Active</SelectItem>
                  <SelectItem value="pendingImport">Pending Import</SelectItem>
                </SelectContent>
              </Select>

              <Select
                items={[
                  { value: "__all__", label: "All" },
                  { value: "REGULAR", label: "REGULAR" },
                  { value: "CANNABIS", label: "CANNABIS" },
                ]}
                value={filters.productProfile ?? "__all__"}
                onValueChange={(v) => setFilters((prev) => ({ ...prev, productProfile: v === "__all__" ? undefined : (v as "REGULAR" | "CANNABIS") }))}
              >
                <SelectTrigger className="h-10! w-40">
                  <SelectValue className="text-muted-foreground/60" placeholder="Package Type">
                    {(value: string) =>
                      value === "__all__" ? "Package Type" : value === "REGULAR" ? "REGULAR" : "CANNABIS"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="REGULAR">REGULAR</SelectItem>
                  <SelectItem value="CANNABIS">CANNABIS</SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button className="h-9! rounded! px-3.5! text-[14px]! font-medium!" disabled={!activeRows.length || exporting}>
                      {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                      Export
                    </Button>
                  }
                />
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport("csv")}>Export to CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("xls")}>Export to Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Checkbox
                  checked={showLastUpdated}
                  onCheckedChange={(checked) => {
                    setShowLastUpdated(!!checked);
                    if (!checked) setFilters((prev) => ({ ...prev, lastUpdatedWithinDays: undefined }));
                  }}
                />
                Filter based on the latest activity
              </label>

              {showLastUpdated && (
                <Select
                  items={Array.from({ length: 30 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} days` }))}
                  value={filters.lastUpdatedWithinDays ? String(filters.lastUpdatedWithinDays) : undefined}
                  onValueChange={(v) => setFilters((prev) => ({ ...prev, lastUpdatedWithinDays: Number(v) }))}
                >
                  <SelectTrigger className="h-9! w-24">
                    <SelectValue placeholder="Days" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1} days
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Checkbox
                  checked={showLastAdjusted}
                  onCheckedChange={(checked) => {
                    setShowLastAdjusted(!!checked);
                    if (!checked) setFilters((prev) => ({ ...prev, lastManuallyAdjustedWithinDays: undefined }));
                  }}
                />
                Last adjusted
              </label>

              {showLastAdjusted && (
                <Select
                  items={Array.from({ length: 90 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} day${i + 1 > 1 ? "s" : ""}` }))}
                  value={filters.lastManuallyAdjustedWithinDays ? String(filters.lastManuallyAdjustedWithinDays) : undefined}
                  onValueChange={(v) => setFilters((prev) => ({ ...prev, lastManuallyAdjustedWithinDays: Number(v) }))}
                >
                  <SelectTrigger className="h-9! w-24">
                    <SelectValue placeholder="Days" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 90 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1} day{i + 1 > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {activeFilterChips.map((chip) => (
                  <Badge key={chip.key} variant="outline" className="gap-1 pr-1">
                    {chip.label}
                    <button onClick={() => handleClearFilter(chip.key)} className="rounded-full hover:bg-muted">
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 border-b border-border">
          <Tabs value={tab} onValueChange={(v) => setTab(v as PackageTab)}>
            <TabsList variant="line" className="h-auto gap-7 p-0">
              {TAB_OPTIONS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="h-auto flex-none -mb-px rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-0 pb-3 text-sm font-normal text-foreground/70 after:hidden focus-visible:border-b-primary focus-visible:ring-0 focus-visible:outline-none data-active:border-primary"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="relative overflow-hidden rounded-xl">
          <TableLoadingOverlay show={loading && activeRows.length > 0} />
          <div className="overflow-auto *:data-[slot=table-container]:overflow-visible" style={{ maxHeight: "calc(100vh - 420px)" }}>
            <Table className="table-fixed">
              <TableHeader className="sticky top-0 z-10 [&_tr]:border-b-0 [&_th]:h-13 [&_th]:px-4">
                <TableRow className="bg-[#FAFAFA]">
                  {tab === "archived" ? (
                    <>
                      <TableHead>Package ID</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Archived At</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={activeRows.length > 0 && selectedRowKeys.length === activeRows.length}
                          onCheckedChange={(checked) => toggleAllRows(!!checked)}
                        />
                      </TableHead>
                      <TableHead className="w-[9%]">Package ID</TableHead>
                      <TableHead className="w-[20%]">Product Name</TableHead>
                      <TableHead className="w-[13%]">Metrc Tag</TableHead>
                      <TableHead className="w-[8%]">Brand</TableHead>
                      <TableHead className="w-[8%]">Category</TableHead>
                      <TableHead className="w-[8%] text-center">Orig. Qty</TableHead>
                      <TableHead className="w-[7%] text-center">Qty Left</TableHead>
                      {showMetrcQtyColumn && <TableHead className="w-[6%] text-center">Metrc Qty</TableHead>}
                      <TableHead className="w-[8%] text-center">Converted QTY</TableHead>
                      <TableHead className="w-[6%] text-center">Status</TableHead>
                      <TableHead className="w-[5%] text-center">Age</TableHead>
                      <TableHead className="w-[8%]">Last Adj.</TableHead>
                      <TableHead className="w-32 text-center">
                        Action
                      </TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody className="text-foreground/70 [&_td]:px-4 [&_td]:py-3">
                {loading && activeRows.length === 0 &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`sk-${i}`} className="border-b-0">
                      {Array.from({ length: tab === "archived" ? 3 : showMetrcQtyColumn ? 13 : 12 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                {!loading && activeRows.length === 0 && (
                  <TableRow className="border-b-0">
                    <TableCell colSpan={tab === "archived" ? 3 : showMetrcQtyColumn ? 13 : 12} className="py-10 text-center text-muted-foreground">
                      No packages found.
                    </TableCell>
                  </TableRow>
                )}

                {tab === "archived"
                  ? activeRows.map((row, i) => (
                    <TableRow key={row.id} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                      <TableCell>
                        <button className="text-primary hover:underline" onClick={() => openRow(row.id)}>
                          {row.advertisedId || "-"}
                        </button>
                      </TableCell>
                      <TableCell>{row.name || "-"}</TableCell>
                      <TableCell>{fmtDate(row.archivedAt)}</TableCell>
                    </TableRow>
                  ))
                  : activeRows.map((row, i) => (
                    <TableRow
                      key={row.id}
                      className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                    >
                      <TableCell>
                        <Checkbox checked={isRowSelected(row.id)} onCheckedChange={(checked) => toggleRow(row, !!checked)} />
                      </TableCell>
                      <TableCell>
                        <button className="text-primary hover:underline" onClick={() => openRow(row.id)}>
                          {row.advertisedId || "-"}
                        </button>
                      </TableCell>
                      <TableCell className="max-w-70 whitespace-normal" title={row.name}>
                        {row.name || "-"}
                      </TableCell>
                      <TableCell>{row.metrcTag || "-"}</TableCell>
                      <TableCell>{row.productBrand || "-"}</TableCell>
                      <TableCell>{row.productCategory || "-"}</TableCell>
                      <TableCell className="text-center font-mono">
                        {row.originalQuantity ?? "-"} {row.uoMShortForm}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {(row.quantityLeft ?? 0).toFixed(2)} {row.uoMShortForm}
                      </TableCell>
                      {showMetrcQtyColumn && (
                        <TableCell className="text-center font-mono">{row.metrQuantity ?? "-"}</TableCell>
                      )}
                      <TableCell className="text-center">
                        {row.quantityLeft && row.projectedQtyConversionRate && row.projectedQtyConversionRate > 0 ? (
                          <div className="flex flex-col items-center text-xs">
                            <span className="font-medium">
                              {row.quantityLeft} {row.uoMShortForm}
                            </span>
                            <span className="leading-none text-muted-foreground">↓</span>
                            <span className="font-medium">
                              {(row.quantityLeft / row.projectedQtyConversionRate).toFixed(2)}
                            </span>
                            <span className="text-muted-foreground">(Rate: {row.projectedQtyConversionRate})</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={row.isActive ? "default" : "destructive"}>{row.isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">{ageInDays(row.createdAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(row.updatedAt)}</TableCell>
                      <TableCell
                        className={`sticky right-0 z-10 w-32 text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.35)] ${i % 2 === 1 ? "bg-table-zebra" : "bg-background"}`}
                      >
                        <Button
                          className="h-9! rounded! px-3.5! text-[14px]! font-normal!"
                          variant="outline"
                          disabled={reconcileLoadingId === row.id}
                          onClick={() => openReconcile(row.id)}
                        >
                          {reconcileLoadingId === row.id ? "Loading..." : "Reconcile"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <TablePagination
          page={pagination.current}
          totalPages={pagination.totalPages}
          totalEntries={pagination.total}
          pageSize={pagination.pageSize}
          loading={loading}
          onPageChange={(p: number) => loadPackages(p, pagination.pageSize)}
          compact
          pageSizeOptions={[50, 100, 200]}
          onPageSizeChange={(size) => loadPackages(1, size)}
        />
      </div>

      <PackageDetailsPanel
        id={openId}
        onClose={closeDetail}
        onChanged={() => loadPackages(pagination.current, pagination.pageSize)}
        locationMap={locationMap}
      />

      <RepackageDrawer
        open={repackageOpen}
        onClose={() => setRepackageOpen(false)}
        selectedPackages={selectedMetrcRows}
        onRepackaged={() => {
          setRepackageOpen(false);
          setSelectedRowKeys([]);
          setSelectedRows([]);
          loadPackages(pagination.current, pagination.pageSize);
        }}
      />

      <WasteDrawer
        open={wasteOpen}
        onClose={() => setWasteOpen(false)}
        selectedPackages={selectedRows}
        onWasted={() => {
          setWasteOpen(false);
          setSelectedRowKeys([]);
          setSelectedRows([]);
          loadPackages(pagination.current, pagination.pageSize);
        }}
      />

      <BulkFinishDrawer
        open={bulkFinishOpen}
        onClose={() => setBulkFinishOpen(false)}
        selectedPackages={selectedRows}
        onFinished={() => {
          setBulkFinishOpen(false);
          setSelectedRowKeys([]);
          setSelectedRows([]);
          loadPackages(pagination.current, pagination.pageSize);
        }}
      />

      <BulkUploadDrawer
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onUploaded={() => {
          setBulkUploadOpen(false);
          loadPackages(pagination.current, pagination.pageSize);
        }}
      />

      <ReconcilePackageDrawer
        open={!!reconcileDetail}
        packageDetail={reconcileDetail}
        onClose={() => setReconcileDetail(null)}
        onReconciled={() => {
          setReconcileDetail(null);
          loadPackages(pagination.current, pagination.pageSize);
        }}
      />

      <CleanupPackagesDrawer
        open={cleanupViewOpen}
        onClose={() => setCleanupViewOpen(false)}
        packageIds={cleanupPackageIds}
        shopId={shopId}
        onIgnored={loadCleanupRecord}
      />

      <CleanupPreferencesDrawer
        open={cleanupPrefsOpen}
        onClose={() => setCleanupPrefsOpen(false)}
        shopId={shopId}
        onSaved={loadCleanupRecord}
      />
    </div>
  );
}
