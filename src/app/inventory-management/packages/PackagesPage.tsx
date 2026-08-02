"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Loader2, Plus, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { useDebounce } from "@/hooks/useDebounce";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { fetchPackagesMinimalExtended } from "@/services/packages/listMinimalExtended";
import { fetchArchivedPackages } from "@/services/packages/listArchived";
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

  const [tab, setTab] = useState<PackageTab>("unFinish");
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [archivedRows, setArchivedRows] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 30, total: 0, totalPages: 1 });

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [locations, setLocations] = useState<StorageLocationOption[]>([]);
  const [locationMap, setLocationMap] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<PackageFilters>(DEFAULT_FILTERS);
  const debouncedSearchText = useDebounce(filters.searchText, 300);

  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  const [selectedRows, setSelectedRows] = useState<PackageRow[]>([]);

  const [repackageOpen, setRepackageOpen] = useState(false);
  const [wasteOpen, setWasteOpen] = useState(false);
  const [bulkFinishOpen, setBulkFinishOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [cleanupCount, setCleanupCount] = useState(0);

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

  useEffect(() => {
    if (!shopId) return;
    fetchInventoryCleanupRecord(shopId as string)
      .then((res) => setCleanupCount(res?.data?.data?.packages?.length ?? 0))
      .catch(() => setCleanupCount(0));
  }, [shopId]);

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

  const handleClearFilter = (key: keyof PackageFilters) => {
    setFilters((prev) => ({ ...prev, [key]: key === "searchText" ? "" : undefined }));
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
    <div className="flex gap-4 p-6">
      <div className={openId ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/inventory-management">Inventory Management</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Packages</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-wrap items-center gap-2">
            {cleanupCount > 0 && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
                {cleanupCount} packages need cleanup
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" disabled={!activeRows.length || exporting}>
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

            {shouldPopulateMetrcData ? (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button><Plus className="size-4" /> Add</Button>} />
                <DropdownMenuContent>
                  <DropdownMenuItem render={<Link href="/inventory-management/packages/add" />}>Create Regular Package</DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/inventory-management/packages/import-metrc" />}>Import From METRC</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button render={<Link href="/inventory-management/packages/add" />}>
                <Plus className="size-4" /> Add Package
              </Button>
            )}

            <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
              Bulk Package Upload
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as PackageTab)}>
          <TabsList>
            {TAB_OPTIONS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {tab !== "archived" && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="Search By.."
                  style={{ maxWidth: 180 }}
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
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advertisedIds">Package ID</SelectItem>
                    <SelectItem value="metrcTags">Metrc Tag</SelectItem>
                    <SelectItem value="packageName">Package Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ApiSelect
                placeholder="All Categories"
                value={filters.productCategoryIds ?? null}
                onChange={(val) => setFilters((prev) => ({ ...prev, productCategoryIds: (val as string) ?? undefined }))}
                fetchPage={async (page, search) => {
                  const res = await fetchCategoriesList({ page, limit: 20, ...(search ? { search } : {}) } as any);
                  return { items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
                }}
                triggerClassName="w-40"
              />

              <ApiSelect
                placeholder="Select Brand..."
                value={filters.productBrandIds ?? null}
                onChange={(val) => setFilters((prev) => ({ ...prev, productBrandIds: (val as string) ?? undefined }))}
                fetchPage={async (page, search) => {
                  const res = await fetchBrandsList({ page, limit: 20, ...(search ? { search } : {}) } as any);
                  return { items: (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
                }}
                triggerClassName="w-40"
              />

              <Select
                items={[{ value: "__all__", label: "All Locations" }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
                value={filters.storageLocationId ?? "__all__"}
                onValueChange={(v) => setFilters((prev) => ({ ...prev, storageLocationId: v === "__all__" ? undefined : (v as string) }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Locations" />
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
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Discrepancy" />
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
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="PLATFORM">POS (Point of Sale)</SelectItem>
                  <SelectItem value="METRC">METRC</SelectItem>
                </SelectContent>
              </Select>

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
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
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
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="REGULAR">REGULAR</SelectItem>
                  <SelectItem value="CANNABIS">CANNABIS</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)} className="ml-auto">
                  Clear Filters
                </Button>
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

        {selectedRowKeys.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
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

            {!isCaliforniaState && (
              <Button size="sm" variant="outline" onClick={() => setWasteOpen(true)}>
                Assign New Waste Tag ({selectedRowKeys.length})
              </Button>
            )}

            {selectedMetrcRows.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setRepackageOpen(true)}>
                Repackage ({selectedMetrcRows.length})
              </Button>
            )}

            {tab === "finishPackages" && (
              <Button size="sm" variant="outline" onClick={() => setBulkFinishOpen(true)}>
                Bulk Finish ({selectedRowKeys.length})
              </Button>
            )}
          </div>
        )}

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && activeRows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
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
                    <TableHead>Package ID</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Metrc Tag</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Orig. Qty</TableHead>
                    <TableHead className="text-center">Qty Left</TableHead>
                    {showMetrcQtyColumn && <TableHead className="text-center">Metrc Qty</TableHead>}
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Age</TableHead>
                    <TableHead>Last Adj.</TableHead>
                    <TableHead className="sticky right-0 z-10 w-28 bg-muted text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.35)]">
                      Action
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && activeRows.length === 0 &&
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-b-0">
                    {Array.from({ length: tab === "archived" ? 3 : showMetrcQtyColumn ? 12 : 11 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && activeRows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={tab === "archived" ? 3 : showMetrcQtyColumn ? 12 : 11} className="py-10 text-center text-muted-foreground">
                    No packages found.
                  </TableCell>
                </TableRow>
              )}

              {tab === "archived"
                ? activeRows.map((row, i) => (
                  <TableRow key={row.id} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
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
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                  >
                    <TableCell>
                      <Checkbox checked={isRowSelected(row.id)} onCheckedChange={(checked) => toggleRow(row, !!checked)} />
                    </TableCell>
                    <TableCell>
                      <button className="text-primary hover:underline" onClick={() => openRow(row.id)}>
                        {row.advertisedId || "-"}
                      </button>
                    </TableCell>
                    <TableCell className="max-w-50 truncate" title={row.name}>
                      {row.name || "-"}
                    </TableCell>
                    <TableCell>{row.metrcTag || "-"}</TableCell>
                    <TableCell>{row.brand?.name || "-"}</TableCell>
                    <TableCell>{row.category?.name || "-"}</TableCell>
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
                      <Badge variant={row.isActive ? "default" : "destructive"}>{row.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">{ageInDays(row.createdAt)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(row.updatedAt)}</TableCell>
                    <TableCell
                      className={`sticky right-0 z-10 w-28 text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.35)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : "bg-background"}`}
                    >
                      <Button size="sm" variant="outline" onClick={() => openRow(row.id)}>
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          page={pagination.current}
          totalPages={pagination.totalPages}
          totalEntries={pagination.total}
          pageSize={pagination.pageSize}
          loading={loading}
          onPageChange={(p: number) => loadPackages(p, pagination.pageSize)}
        />
      </div>

      {openId && (
        <PackageDetailsPanel
          id={openId}
          onClose={closeDetail}
          onChanged={() => loadPackages(pagination.current, pagination.pageSize)}
          locationMap={locationMap}
        />
      )}

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
    </div>
  );
}
