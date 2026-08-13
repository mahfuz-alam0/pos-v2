"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Info, Loader2, PackageSearch } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchStorageLocations } from "@/services/storageLocations/list";
import { fetchPackagesMinimalExtended } from "@/services/packages/listMinimalExtended";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { commitWithinLocationTransfer } from "@/services/transfers/commitTransfer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiSelect } from "@/components/ui/api-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PackagePickerTable, { type PackagePickerRow } from "./PackagePickerTable";
import { useSettings } from "@/context/settings-context";

const PAGE_SIZE_OPTIONS = [30, 50, 100, 200];

export default function WithinLocationTransferForm({
  preSelectedPackageIds,
  preSelectedSourceId,
}: {
  /** Packages picked in bulk from the Packages list before landing here (old
   * app: index.js's "Transfer (N)" bulk button). Auto-checked as soon as a
   * matching row shows up under whichever source location the user picks —
   * the picker's own location-scoped search stays the source of truth. */
  preSelectedPackageIds?: string[];
  /** Storage location holding the most of the bulk-picked packages above —
   * pre-picked as Source Storage so those packages auto-check immediately
   * instead of waiting on a manual source pick. */
  preSelectedSourceId?: string;
} = {}) {
  const router = useRouter();
  const { shopId } = useShop();
  const { defaultPageSize } = useSettings();

  const [locations, setLocations] = useState<any[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(preSelectedSourceId ?? null);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchBy, setSearchBy] = useState<"packageIds" | "packageName">("packageName");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [packageStatus, setPackageStatus] = useState<string | null>(null);
  const [packageType, setPackageType] = useState<string | null>(null);

  const [rows, setRows] = useState<PackagePickerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const [selectedRows, setSelectedRows] = useState<PackagePickerRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!shopId) return;
    setLocationsLoading(true);
    fetchStorageLocations(shopId, { limit: 300, page: 1 })
      .then((res) => setLocations(res?.data?.data?.locations ?? []))
      .catch(() => toast.error("Failed to load storage locations"))
      .finally(() => setLocationsLoading(false));
  }, [shopId]);

  useEffect(() => {
    if (sourceId === destinationId) setDestinationId(null);
  }, [sourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPackages = useCallback(
    async (targetPage = 1, size = pageSize) => {
      if (!shopId || !sourceId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = {
          limit: size,
          page: targetPage,
          isFinished: false,
          isImported: true,
          storageLocationId: sourceId,
          sortByAlpha: 1,
        };
        if (debouncedSearch) {
          if (searchBy === "packageIds") {
            params.advertisedIds = debouncedSearch
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          } else {
            params.packageName = debouncedSearch;
          }
        }
        if (categoryId) params.productCategoryIds = categoryId;
        if (brandId) params.productBrandIds = brandId;
        if (packageStatus === "active") params.isActive = true;
        if (packageStatus === "expired") params.isExpired = true;
        if (packageStatus === "sample") params.isSample = true;
        if (packageType) params.packageType = packageType;

        const res = await fetchPackagesMinimalExtended(shopId, params);
        const packages = (res?.data?.packages ?? []).filter(
          (pkg: any) => (pkg.storageLocationBreakdown?.[sourceId] ?? 0) > 0
        );
        setRows(
          packages.map((pkg: any) => ({
            ...pkg,
            displayQuantityToShift:
              selectedRows.find((r) => r.id === pkg.id)?.displayQuantityToShift ?? 1,
          }))
        );

        if (preSelectedPackageIds?.length) {
          // Default to 1 here too — same as every other selection path
          // (toggleRow/toggleAll) — so the qty this seeds into selectedRows
          // always matches what the input actually displays (which reads
          // off `rows`, seeded at 1 above). Pre-filling with the full
          // location quantity here silently desynced the two: the input
          // kept showing 1 while the submitted payload carried the real qty.
          setSelectedRows((prev) => {
            const merged = [...prev];
            packages.forEach((pkg: any) => {
              if (preSelectedPackageIds.includes(pkg.id) && !merged.find((m) => m.id === pkg.id)) {
                merged.push({ ...pkg, displayQuantityToShift: 1 });
              }
            });
            return merged.length > 10 ? merged.slice(0, 10) : merged;
          });
        }
        const pag = res?.data?.paginationData ?? {};
        setTotalPages(pag.totalPages ?? 1);
        setTotalEntries(pag.totalEntries ?? packages.length);
        setPage(pag.currentPage ?? targetPage);
      } catch (err: any) {
        toast.error(err?.message || "Failed to fetch packages");
      } finally {
        setLoading(false);
      }
    },
    [shopId, sourceId, debouncedSearch, searchBy, categoryId, brandId, packageStatus, packageType, pageSize] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (sourceId) loadPackages(1);
  }, [sourceId, debouncedSearch, searchBy, categoryId, brandId, packageStatus, packageType]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCategoryPage = useCallback(async (pageNum: number, term: string) => {
    const res = await fetchCategoriesList({ page: pageNum, limit: 10, search: term } as any);
    return {
      items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const fetchBrandPage = useCallback(async (pageNum: number, term: string) => {
    const res = await fetchBrandsList({ page: pageNum, limit: 10, search: term } as any);
    return {
      items: (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const toggleRow = (row: PackagePickerRow, checked: boolean) => {
    if (checked) {
      if (selectedRows.length >= 10) {
        toast.error("Cannot select more than 10 packages at once!");
        return;
      }
      setSelectedRows((prev) => [...prev, { ...row, displayQuantityToShift: row.displayQuantityToShift ?? 1 }]);
    } else {
      setSelectedRows((prev) => prev.filter((r) => r.id !== row.id));
    }
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const merged = [...selectedRows];
      rows.forEach((r) => {
        if (!merged.find((m) => m.id === r.id)) merged.push({ ...r, displayQuantityToShift: r.displayQuantityToShift ?? 1 });
      });
      if (merged.length > 10) {
        toast.error("Cannot select more than 10 packages at once!");
        return;
      }
      setSelectedRows(merged);
    } else {
      const rowIds = new Set(rows.map((r) => r.id));
      setSelectedRows((prev) => prev.filter((r) => !rowIds.has(r.id)));
    }
  };

  const updateQty = (id: string, value: number) => {
    // PackagePickerTable's qty input reads its value off `rows` (the search
    // results it renders), not `selectedRows` — both need updating or the
    // input immediately snaps back to the old value on every keystroke.
    setSelectedRows((prev) => prev.map((r) => (r.id === id ? { ...r, displayQuantityToShift: value } : r)));
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, displayQuantityToShift: value } : r)));
  };

  const selectedIds = useMemo(() => selectedRows.map((r) => r.id), [selectedRows]);

  const handleSubmit = async () => {
    if (!shopId) return;
    if (!sourceId || !destinationId) {
      toast.error("Please select source and destination location first");
      return;
    }
    if (sourceId === destinationId) {
      toast.error("Source and destination storage location cannot be the same");
      return;
    }
    if (selectedRows.length === 0) {
      toast.error("Please select at least one package to complete the transfer");
      return;
    }
    setSubmitting(true);
    try {
      await commitWithinLocationTransfer(shopId, {
        sourceStorageLocationId: sourceId,
        destinationStorageLocationId: destinationId,
        notes,
        items: selectedRows.map((row) => ({
          packageId: row.id,
          displayQuantityToShift: row.displayQuantityToShift,
        })),
      });
      toast.success("Transfer created successfully");
      router.push("/inventory-management/transfers");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create transfer, please try again!");
    } finally {
      setSubmitting(false);
    }
  };

  const routeReady = Boolean(sourceId && destinationId);
  return (
    <div className="flex flex-col gap-4" style={{ "--color-foreground": "#374151" } as any}>
      <div className="rounded-lg border border-border bg-[#F8FAFC] p-5">
        <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Transfer Information</p>

        <div className="flex flex-nowrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Source Storage <span className="text-destructive">*</span>
            </span>
            <Select
              items={[{ value: "__none__", label: "Select source" }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
              value={sourceId ?? "__none__"}
              onValueChange={(v) => setSourceId(v as string)}
              disabled={locationsLoading}
            >
              <SelectTrigger className="h-9! w-56 bg-white dark:bg-input/30">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="mb-2 text-lg text-muted-foreground/60 select-none">→</span>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Destination Storage <span className="text-destructive">*</span>
            </span>
            <Select
              items={[
                { value: "__none__", label: "Select destination" },
                ...locations.filter((l) => l.id !== sourceId).map((l) => ({ value: l.id, label: l.name })),
              ]}
              value={destinationId ?? "__none__"}
              onValueChange={(v) => setDestinationId(v as string)}
              disabled={locationsLoading}
            >
              <SelectTrigger className="h-9! w-56 bg-white dark:bg-input/30">
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {locations
                  .filter((l) => l.id !== sourceId)
                  .map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Notes</span>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes for this transfer..."
              rows={1}
              className="h-9 min-h-0 resize-none bg-white dark:bg-input/30 py-1.5"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Select Packages For Transfer</span>
            {totalEntries > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{totalEntries} total</span>
            )}
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {selectedIds.length} selected
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRows([])}>
                Clear
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-[#F8FAFC] px-4 py-3">
          <div className="flex h-10 w-88">
            <Input
              placeholder="Search By..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-48 rounded-r-none border-r-0 bg-white dark:bg-input/30"
            />
            <Select
              items={[
                { value: "packageIds", label: "Package ID" },
                { value: "packageName", label: "Package Name" },
              ]}
              value={searchBy}
              onValueChange={(v) => setSearchBy(v as typeof searchBy)}
            >
              <SelectTrigger className="h-10! w-40 rounded-l-none bg-white dark:bg-input/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="packageIds">Package ID</SelectItem>
                <SelectItem value="packageName">Package Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ApiSelect
            placeholder="Category"
            value={categoryId}
            onChange={(v) => setCategoryId(v as string | null)}
            fetchPage={fetchCategoryPage}
            triggerClassName="h-10! w-48 bg-white dark:bg-input/30"
          />
          <ApiSelect
            placeholder="Brand"
            value={brandId}
            onChange={(v) => setBrandId(v as string | null)}
            fetchPage={fetchBrandPage}
            triggerClassName="h-10! w-48 bg-white dark:bg-input/30"
          />
          <Select
            items={[
              { value: "__all__", label: "All Statuses" },
              { value: "active", label: "Active" },
              { value: "expired", label: "Expired" },
              { value: "sample", label: "Sample" },
            ]}
            value={packageStatus ?? "__all__"}
            onValueChange={(v) => setPackageStatus(v === "__all__" ? null : (v as string))}
          >
            <SelectTrigger className="h-10! w-48 bg-white dark:bg-input/30">
              <SelectValue placeholder="Package Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="sample">Sample</SelectItem>
            </SelectContent>
          </Select>
          <Select
            items={[
              { value: "__all__", label: "Package Type" },
              { value: "REGULAR", label: "Regular" },
              { value: "CANNABIS", label: "Marijuana" },
            ]}
            value={packageType ?? "__all__"}
            onValueChange={(v) => setPackageType(v === "__all__" ? null : (v as string))}
          >
            <SelectTrigger className="h-10! w-48 bg-white dark:bg-input/30">
              <SelectValue placeholder="Package Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Package Type</SelectItem>
              <SelectItem value="REGULAR">Regular</SelectItem>
              <SelectItem value="CANNABIS">Marijuana</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-10! w-30 border-border bg-white text-sm font-normal text-foreground dark:bg-input/30"
            onClick={() => {
              setSearch("");
              setSearchBy("packageName");
              setCategoryId(null);
              setBrandId(null);
              setPackageStatus(null);
              setPackageType(null);
            }}
          >
            Reset Filters
          </Button>
        </div>

        <div className="bg-card">
          {!sourceId ? (
            <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 m-4 text-sm text-primary">
              <Info className="size-4 shrink-0" />
              Select a source storage location above to view available packages
            </div>
          ) : rows.length === 0 && !loading ? (
            <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/40 px-4 py-10 m-4 text-center">
              <PackageSearch className="size-8 text-muted-foreground/60" />
              <p className="text-sm font-medium">No packages found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <PackagePickerTable
              rows={rows}
              loading={loading}
              selectedIds={selectedIds}
              onToggle={toggleRow}
              onToggleAll={toggleAll}
              showQtyColumn
              sourceLocationId={sourceId}
              onQtyChange={updateQty}
              page={page}
              totalPages={totalPages}
              totalEntries={totalEntries}
              pageSize={pageSize}
              onPageChange={loadPackages}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(s) => {
                setPageSize(s);
                loadPackages(1, s);
              }}
            />
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex justify-end rounded-b-xl border-t border-border/70 bg-card px-6 py-3">
        <Button
          className="h-10! text-sm!"
          disabled={submitting || selectedRows.length === 0 || !routeReady}
          onClick={handleSubmit}
        >
          {submitting && <Loader2 className="size-3.5 animate-spin" />}
          Create Transfer {selectedRows.length > 0 && `(${selectedRows.length})`}
        </Button>
      </div>
    </div>
  );
}
