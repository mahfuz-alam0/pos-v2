"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useDebounce } from "@/hooks/useDebounce";
import { useShop } from "@/context/shop-context";
import { fetchPackagesMinimalExtended } from "@/services/packages/listMinimalExtended";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchOriginalCategories } from "@/services/categories/originalCategories";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchStorageLocations } from "@/services/storageLocations/list";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ApiSelect } from "@/components/ui/api-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { X } from "lucide-react";

import PackageDetailsPanel from "@/app/admin/inventory/packages/PackageDetailsPanel";
import type { PackageRow, StorageLocationOption } from "@/app/admin/inventory/packages/types";
import SyncPackagesButton from "./SyncPackagesButton";
import MetrcActivityDrawer from "./MetrcActivityDrawer";
import BulkReconcileDialog from "./BulkReconcileDialog";

type MetrcTab = "unFinish" | "finishPackages" | "finishedPackages" | "conversions";

const TAB_OPTIONS: { value: MetrcTab; label: string }[] = [
  { value: "unFinish", label: "Live Packages" },
  { value: "finishPackages", label: "Finish Packages" },
  { value: "finishedPackages", label: "Finished Packages" },
  { value: "conversions", label: "Conversions" },
];

interface MetrcFilters {
  searchText: string;
  searchType: "metrcTags" | "productId";
  originalCategoryName?: string;
  productBrandIds?: string;
  storageLocationId?: string;
  discrepancyFilter?: "YES" | "NO";
  source?: "PLATFORM" | "METRC";
  packageStatus?: "isActive" | "isSample" | "isImported" | "isExpired" | "pendingImport";
  productProfile?: "REGULAR" | "CANNABIS";
  lastUpdatedWithinDays?: number;
  lastManuallyAdjustedWithinDays?: number;
}

const DEFAULT_FILTERS: MetrcFilters = { searchText: "", searchType: "metrcTags" };

function buildParams(tab: MetrcTab, filters: MetrcFilters, page: number, limit: number) {
  const params: Record<string, any> = { page, limit, source: filters.source ?? "METRC", sortByCreatedAt: -1 };

  if (tab === "unFinish") params.isFinished = false;
  else if (tab === "finishPackages") {
    params.isFinished = false;
    params.shouldRequiredToBeFinished = true;
  } else if (tab === "finishedPackages") {
    params.isFinished = true;
    params.hasMETRCDiscrepancy = true;
  } else if (tab === "conversions") {
    params.isConverted = true;
    params.isFinished = false;
  }

  if (filters.searchText) params[filters.searchType] = filters.searchText;
  if (filters.originalCategoryName) params.originalCategoryNames = filters.originalCategoryName;
  if (filters.productBrandIds) params.productBrandIds = filters.productBrandIds;
  if (filters.storageLocationId) params.storageLocationId = filters.storageLocationId;
  if (filters.discrepancyFilter === "YES") params.hasMETRCDiscrepancy = true;
  else if (filters.discrepancyFilter === "NO") params.hasNoMETRCDiscrepancy = true;
  if (filters.packageStatus === "pendingImport") params.isImported = false;
  else if (filters.packageStatus) params[filters.packageStatus] = true;
  if (filters.productProfile) params.packageType = filters.productProfile;
  if (filters.lastUpdatedWithinDays) params.lastUpdatedWithinDays = filters.lastUpdatedWithinDays;
  if (filters.lastManuallyAdjustedWithinDays) params.lastManuallyAdjustedWithinDays = filters.lastManuallyAdjustedWithinDays;

  return params;
}

export default function MetrcPackagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shopId } = useShop();
  const openId = searchParams.get("id");

  const [tab, setTab] = useState<MetrcTab>("unFinish");
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 100, total: 0, totalPages: 1 });

  const [filters, setFilters] = useState<MetrcFilters>(DEFAULT_FILTERS);
  const debouncedSearchText = useDebounce(filters.searchText, 300);
  const [showLastUpdated, setShowLastUpdated] = useState(false);
  const [showLastAdjusted, setShowLastAdjusted] = useState(false);

  const [locations, setLocations] = useState<StorageLocationOption[]>([]);

  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  const [selectedRows, setSelectedRows] = useState<PackageRow[]>([]);

  const [activityOpen, setActivityOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    fetchStorageLocations(shopId as string)
      .then((res) => setLocations(res?.data?.data?.locations ?? []))
      .catch(() => {});
  }, [shopId]);

  const loadPackages = useCallback(
    async (page = 1, limit = pagination.pageSize) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params = buildParams(tab, { ...filters, searchText: debouncedSearchText }, page, limit);
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
      } finally {
        setLoading(false);
      }
    },
    [shopId, tab, filters, debouncedSearchText, pagination.pageSize]
  );

  useEffect(() => {
    loadPackages(1, pagination.pageSize);
    setSelectedRowKeys([]);
    setSelectedRows([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    shopId,
    tab,
    filters.originalCategoryName,
    filters.productBrandIds,
    filters.storageLocationId,
    filters.discrepancyFilter,
    filters.source,
    filters.packageStatus,
    filters.productProfile,
    filters.lastUpdatedWithinDays,
    filters.lastManuallyAdjustedWithinDays,
    debouncedSearchText,
  ]);

  const handleClearFilter = (key: keyof MetrcFilters) => {
    setFilters((prev) => ({ ...prev, [key]: key === "searchText" ? "" : undefined }));
    if (key === "lastUpdatedWithinDays") setShowLastUpdated(false);
    if (key === "lastManuallyAdjustedWithinDays") setShowLastAdjusted(false);
  };

  const activeFilterChips = useMemo(() => {
    const chips: { key: keyof MetrcFilters; label: string }[] = [];
    if (filters.searchText) {
      chips.push({ key: "searchText", label: `${filters.searchType === "metrcTags" ? "Metrc Tag" : "Product Id"}: ${filters.searchText}` });
    }
    if (filters.originalCategoryName) chips.push({ key: "originalCategoryName", label: `Orig. Category: ${filters.originalCategoryName}` });
    if (filters.productBrandIds) chips.push({ key: "productBrandIds", label: `Brand: ${filters.productBrandIds}` });
    if (filters.storageLocationId) {
      const loc = locations.find((l: any) => (l.id ?? (l as any)._id) === filters.storageLocationId);
      chips.push({ key: "storageLocationId", label: `Location: ${loc?.name ?? filters.storageLocationId}` });
    }
    if (filters.discrepancyFilter) chips.push({ key: "discrepancyFilter", label: `Metrc Discrepancy: ${filters.discrepancyFilter === "YES" ? "Has Discrepancy" : "No Discrepancy"}` });
    if (filters.source) chips.push({ key: "source", label: `Source: ${filters.source === "PLATFORM" ? "POS" : "Metrc"}` });
    if (filters.packageStatus) {
      const label = filters.packageStatus === "pendingImport" ? "Pending Import" : filters.packageStatus;
      chips.push({ key: "packageStatus", label: `Package Status: ${label}` });
    }
    if (filters.productProfile) chips.push({ key: "productProfile", label: `Package Type: ${filters.productProfile}` });
    if (filters.lastUpdatedWithinDays) chips.push({ key: "lastUpdatedWithinDays", label: `Last updated: ${filters.lastUpdatedWithinDays} days` });
    if (filters.lastManuallyAdjustedWithinDays) chips.push({ key: "lastManuallyAdjustedWithinDays", label: `Last adjusted: ${filters.lastManuallyAdjustedWithinDays} days` });
    return chips;
  }, [filters, locations]);

  const hasActiveFilters = activeFilterChips.length > 0;

  const isRowSelected = (id: string | number) => selectedRowKeys.includes(id);
  const canSelectRow = (row: PackageRow) => (row.quantityLeft ?? 0) !== (row.metrQuantity ?? 0);
  const selectableRows = useMemo(() => rows.filter(canSelectRow), [rows]);

  const toggleRow = (row: PackageRow, checked: boolean) => {
    setSelectedRowKeys((prev) => (checked ? [...prev, row.id] : prev.filter((k) => k !== row.id)));
    setSelectedRows((prev) => (checked ? [...prev, row] : prev.filter((r) => r.id !== row.id)));
  };

  const toggleAllRows = (checked: boolean) => {
    setSelectedRowKeys(checked ? selectableRows.map((r) => r.id) : []);
    setSelectedRows(checked ? selectableRows : []);
  };

  const openRow = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", id);
    router.push(`/metrc/reconciliations?${params.toString()}`, { scroll: false });
  };

  const closeDetail = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    router.push(`/metrc/reconciliations${params.toString() ? `?${params}` : ""}`, { scroll: false });
  };

  return (
    <div className="flex gap-4 p-6">
      <div className={openId ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/inventory">Metrc Reconcilliation</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Packages</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={selectedRowKeys.length === 0} onClick={() => setReconcileOpen(true)}>
              Reconcile {selectedRowKeys.length > 0 && selectedRowKeys.length} Package
              {selectedRowKeys.length !== 1 ? "s" : ""} in Metrc
            </Button>
            <SyncPackagesButton />
            <Button variant="outline" onClick={() => setActivityOpen(true)}>
              View Activities
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as MetrcTab)}>
          <TabsList>
            {TAB_OPTIONS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-3 rounded-xl bg-muted/30 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search By.."
              className="w-48"
              value={filters.searchText}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchText: e.target.value }))}
            />
            <Select
              items={[
                { value: "metrcTags", label: "Metrc Tag" },
                { value: "productId", label: "Product Id" },
              ]}
              value={filters.searchType}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, searchType: v as MetrcFilters["searchType"] }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metrcTags">Metrc Tag</SelectItem>
                <SelectItem value="productId">Product Id</SelectItem>
              </SelectContent>
            </Select>

            <div className="mx-1 h-6 w-px bg-foreground/10" />

            <ApiSelect
              placeholder="Orig. Category"
              value={filters.originalCategoryName ?? null}
              onChange={(val) => setFilters((prev) => ({ ...prev, originalCategoryName: (val as string) ?? undefined }))}
              fetchPage={async (page, search) => {
                const res = await fetchOriginalCategories(shopId as string, { page, limit: 20, ...(search ? { name: search } : {}) });
                return { items: (res?.data?.categories ?? []).map((c: any) => ({ id: c.name, name: c.name })), totalPages: res?.data?.paginationData?.totalPages ?? 1 };
              }}
              triggerClassName="w-36"
            />

            <ApiSelect
              placeholder="Brand"
              value={filters.productBrandIds ?? null}
              onChange={(val) => setFilters((prev) => ({ ...prev, productBrandIds: (val as string) ?? undefined }))}
              fetchPage={async (page, search) => {
                const res = await fetchBrandsList({ page, limit: 20, ...(search ? { search } : {}) } as any);
                return { items: (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
              }}
              triggerClassName="w-32"
            />

            <Select
              items={[{ value: "__all__", label: "Storage Location" }, ...locations.map((l: any) => ({ value: l.id ?? l._id, label: l.name }))]}
              value={filters.storageLocationId ?? "__all__"}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, storageLocationId: v === "__all__" ? undefined : (v as string) }))}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Storage Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Storage Location</SelectItem>
                {locations.map((l: any) => (
                  <SelectItem key={l.id ?? l._id} value={l.id ?? l._id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={() => { setFilters(DEFAULT_FILTERS); setShowLastUpdated(false); setShowLastAdjusted(false); }} className="ml-auto">
                Clear Filters
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              items={[
                { value: "__all__", label: "Metrc Discrepancy" },
                { value: "YES", label: "Metrc Discrepancy" },
                { value: "NO", label: "No Metrc Discrepancy" },
              ]}
              value={filters.discrepancyFilter ?? "__all__"}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, discrepancyFilter: v === "__all__" ? undefined : (v as "YES" | "NO") }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Metrc Discrepancy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="YES">Metrc Discrepancy</SelectItem>
                <SelectItem value="NO">No Metrc Discrepancy</SelectItem>
              </SelectContent>
            </Select>

            <Select
              items={[
                { value: "__all__", label: "Source" },
                { value: "PLATFORM", label: "POS (Point of Sale)" },
                { value: "METRC", label: "Metrc" },
              ]}
              value={filters.source ?? "__all__"}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, source: v === "__all__" ? undefined : (v as "PLATFORM" | "METRC") }))}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="PLATFORM">POS (Point of Sale)</SelectItem>
                <SelectItem value="METRC">Metrc</SelectItem>
              </SelectContent>
            </Select>

            <Select
              items={[
                { value: "__all__", label: "Package Status" },
                { value: "isImported", label: "Imported" },
                { value: "isExpired", label: "Expired" },
                { value: "isSample", label: "Sample" },
                { value: "isActive", label: "Active" },
                { value: "pendingImport", label: "Pending Import" },
              ]}
              value={filters.packageStatus ?? "__all__"}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, packageStatus: v === "__all__" ? undefined : (v as MetrcFilters["packageStatus"]) }))}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Package Status" />
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
                { value: "__all__", label: "Package Type" },
                { value: "REGULAR", label: "Regular" },
                { value: "CANNABIS", label: "Marijuana" },
              ]}
              value={filters.productProfile ?? "__all__"}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, productProfile: v === "__all__" ? undefined : (v as "REGULAR" | "CANNABIS") }))}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Package Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="REGULAR">Regular</SelectItem>
                <SelectItem value="CANNABIS">Marijuana</SelectItem>
              </SelectContent>
            </Select>

            <div className="mx-1 h-6 w-px bg-foreground/10" />

            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Checkbox
                checked={showLastUpdated}
                onCheckedChange={(checked) => {
                  setShowLastUpdated(!!checked);
                  if (!checked) setFilters((prev) => ({ ...prev, lastUpdatedWithinDays: undefined }));
                }}
              />
              Latest activity
            </label>

            {showLastUpdated && (
              <Select
                items={Array.from({ length: 30 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} days` }))}
                value={filters.lastUpdatedWithinDays ? String(filters.lastUpdatedWithinDays) : undefined}
                onValueChange={(v) => setFilters((prev) => ({ ...prev, lastUpdatedWithinDays: Number(v) }))}
              >
                <SelectTrigger className="w-24">
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
                <SelectTrigger className="w-24">
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

        {selectedRowKeys.length > 0 && (
          <div className="flex items-center gap-2">
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
          </div>
        )}

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectableRows.length > 0 && selectedRowKeys.length === selectableRows.length}
                    onCheckedChange={(checked) => toggleAllRows(!!checked)}
                  />
                </TableHead>
                <TableHead>Package ID</TableHead>
                <TableHead>Metrc id</TableHead>
                <TableHead>Metrc Tag</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Metrc Item Name</TableHead>
                <TableHead className="text-center">Metrc Qty</TableHead>
                <TableHead className="text-center">Qty Left</TableHead>
                <TableHead className="text-center">Original QTY</TableHead>
                <TableHead className="text-center">Platform Status</TableHead>
                <TableHead className="text-center">Metrc Status</TableHead>
                <TableHead className="text-center">Is On Hold</TableHead>
                <TableHead className="text-center">Converted From</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                rows.length === 0 &&
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-b-0">
                    {Array.from({ length: 13 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={13} className="py-10 text-center text-muted-foreground">
                    No packages found.
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row: any, i) => (
                <TableRow
                  key={row.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={isRowSelected(row.id)}
                      disabled={!canSelectRow(row)}
                      onCheckedChange={(checked) => toggleRow(row, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <button className="text-primary hover:underline" onClick={() => openRow(row.id)}>
                      {row.advertisedId || "-"}
                    </button>
                  </TableCell>
                  <TableCell>{row.metrcData?.metrcId ?? "-"}</TableCell>
                  <TableCell>{row.metrcTag ?? row.metrcData?.metrcTag ?? "-"}</TableCell>
                  <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}</TableCell>
                  <TableCell className="max-w-50 truncate" title={row.name}>
                    {row.name || "-"}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {row.metrQuantity ?? "-"} {row.metrcData?.snapShotData?.metrcSnapshotData?.UnitOfMeasureAbbreviation ?? ""}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {(row.quantityLeft ?? 0).toFixed(2)} {row.uoMShortForm}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {row.originalQuantity ?? "-"} {row.uoMShortForm}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={row.status ? "default" : "destructive"}>{row.status ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={row.metrcData?.isActive ? "default" : "destructive"}>{row.metrcData?.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={row.metrcData?.isOnHold ? "default" : "destructive"}>{row.metrcData?.isOnHold ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {row.metrcData?.convertedFrom ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openRow(row.metrcData.convertedFrom)}
                      >
                        Check
                      </Button>
                    ) : (
                      "-"
                    )}
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
          locationMap={{}}
        />
      )}

      <MetrcActivityDrawer open={activityOpen} onClose={() => setActivityOpen(false)} />

      <BulkReconcileDialog
        open={reconcileOpen}
        onClose={() => setReconcileOpen(false)}
        packages={selectedRows}
        onReconciled={() => {
          setSelectedRowKeys([]);
          setSelectedRows([]);
          loadPackages(pagination.current, pagination.pageSize);
        }}
      />
    </div>
  );
}
