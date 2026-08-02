"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Loader2, PackageSearch, Warehouse } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchStorageLocations } from "@/services/storageLocations/list";
import { fetchPackagesMinimalExtended } from "@/services/packages/listMinimalExtended";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { commitWithinLocationTransfer } from "@/services/transfers/commitTransfer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ApiSelect } from "@/components/ui/api-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PackagePickerTable, { type PackagePickerRow } from "./PackagePickerTable";

const PAGE_SIZE = 30;

export default function WithinLocationTransferForm() {
  const router = useRouter();
  const { shopId } = useShop();

  const [locations, setLocations] = useState<any[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [packageStatus, setPackageStatus] = useState<string | null>(null);

  const [rows, setRows] = useState<PackagePickerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

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
    async (targetPage = 1) => {
      if (!shopId || !sourceId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = {
          limit: PAGE_SIZE,
          page: targetPage,
          isFinished: false,
          isImported: true,
          storageLocationId: sourceId,
          sortByAlpha: 1,
        };
        if (debouncedSearch) params.packageName = debouncedSearch;
        if (categoryId) params.productCategoryIds = categoryId;
        if (brandId) params.productBrandIds = brandId;
        if (packageStatus === "active") params.isActive = true;
        if (packageStatus === "expired") params.isExpired = true;
        if (packageStatus === "sample") params.isSample = true;

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
    [shopId, sourceId, debouncedSearch, categoryId, brandId, packageStatus] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (sourceId) loadPackages(1);
  }, [sourceId, debouncedSearch, categoryId, brandId, packageStatus]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (selectedRows.length >= 50) {
        toast.error("Cannot select more than 50 packages at once!");
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
      if (merged.length > 50) {
        toast.error("Cannot select more than 50 packages at once!");
        return;
      }
      setSelectedRows(merged);
    } else {
      const rowIds = new Set(rows.map((r) => r.id));
      setSelectedRows((prev) => prev.filter((r) => !rowIds.has(r.id)));
    }
  };

  const updateQty = (id: string, value: number) => {
    setSelectedRows((prev) => prev.map((r) => (r.id === id ? { ...r, displayQuantityToShift: value } : r)));
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
    <div className="flex flex-col gap-5">
      <Card className="px-5">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Transfer Route</p>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Source Storage <span className="text-destructive">*</span>
              </span>
              <Select
                items={[{ value: "__none__", label: "Select source" }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
                value={sourceId ?? undefined}
                onValueChange={(v) => setSourceId(v as string)}
                disabled={locationsLoading}
              >
                <SelectTrigger className="w-full bg-background">
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

            <div
              className={`mt-4 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                routeReady ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
              }`}
            >
              <ArrowRight className="size-4" />
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Destination Storage <span className="text-destructive">*</span>
              </span>
              <Select
                items={[
                  { value: "__none__", label: "Select destination" },
                  ...locations.filter((l) => l.id !== sourceId).map((l) => ({ value: l.id, label: l.name })),
                ]}
                value={destinationId ?? undefined}
                onValueChange={(v) => setDestinationId(v as string)}
                disabled={locationsLoading}
              >
                <SelectTrigger className="w-full bg-background">
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
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes for this transfer..." rows={2} />
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">Select Packages For Transfer</span>
          <div className="flex items-center gap-3 text-sm">
            {totalEntries > 0 && <span className="text-muted-foreground">{totalEntries} available</span>}
            {selectedIds.length > 0 && (
              <>
                <span className="font-semibold text-primary">{selectedIds.length} selected</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRows([])}>
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search by package name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-56"
          />
          <ApiSelect
            placeholder="Category"
            value={categoryId}
            onChange={(v) => setCategoryId(v as string | null)}
            fetchPage={fetchCategoryPage}
            triggerClassName="w-40"
          />
          <ApiSelect
            placeholder="Brand"
            value={brandId}
            onChange={(v) => setBrandId(v as string | null)}
            fetchPage={fetchBrandPage}
            triggerClassName="w-40"
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
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Package Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="sample">Sample</SelectItem>
            </SelectContent>
          </Select>
          {(search || categoryId || brandId || packageStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setCategoryId(null);
                setBrandId(null);
                setPackageStatus(null);
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>

        {!sourceId ? (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/40 px-4 py-10 text-center">
            <Warehouse className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">No source location selected</p>
            <p className="text-sm text-muted-foreground">Pick a source storage above to browse its available packages.</p>
          </div>
        ) : rows.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/40 px-4 py-10 text-center">
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
            pageSize={PAGE_SIZE}
            onPageChange={loadPackages}
          />
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 flex justify-end bg-background/95 px-6 py-3 backdrop-blur-sm">
        <Button disabled={submitting || selectedRows.length === 0 || !routeReady} onClick={handleSubmit}>
          {submitting && <Loader2 className="size-3.5 animate-spin" />}
          Create Transfer {selectedRows.length > 0 && `(${selectedRows.length})`}
        </Button>
      </div>
    </div>
  );
}
