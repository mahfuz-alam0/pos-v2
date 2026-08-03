"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Inbox, Loader2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchShopsData } from "@/services/shops/list";
import { fetchPackagesMinimalExtended } from "@/services/packages/listMinimalExtended";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { createStoreToStoreTransfer } from "@/services/transfers/createStoreToStoreTransfer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiSelect } from "@/components/ui/api-select";
import { DocumentsUpload } from "@/components/admin/form-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PackagePickerTable, { type PackagePickerRow } from "./PackagePickerTable";

const PAGE_SIZE = 30;

export default function ShopTransferForm() {
  const router = useRouter();
  const { shopId } = useShop();

  const [shops, setShops] = useState<any[]>([]);
  const [destinationShopId, setDestinationShopId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [documentLinks, setDocumentLinks] = useState<string[]>([]);

  const [search, setSearch] = useState("");
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

  const [selectedRows, setSelectedRows] = useState<(PackagePickerRow & { unitPrice?: number })[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchShopsData().then((res) => {
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      setShops(res?.data ?? []);
    });
  }, []);

  const loadPackages = useCallback(
    async (targetPage = 1) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = {
          limit: PAGE_SIZE,
          page: targetPage,
          isFinished: false,
          sortByAlpha: 1,
        };
        if (search) {
          if (searchBy === "packageIds") {
            params.advertisedIds = search
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          } else {
            params.packageName = search;
          }
        }
        if (categoryId) params.productCategoryIds = categoryId;
        if (brandId) params.productBrandIds = brandId;
        if (packageStatus === "active") params.isActive = true;
        if (packageStatus === "expired") params.isExpired = true;
        if (packageStatus === "sample") params.isSample = true;
        if (packageType) params.packageType = packageType;
        const res = await fetchPackagesMinimalExtended(shopId, params);
        setRows(res?.data?.packages ?? []);
        const pag = res?.data?.paginationData ?? {};
        setTotalPages(pag.totalPages ?? 1);
        setTotalEntries(pag.totalEntries ?? 0);
        setPage(pag.currentPage ?? targetPage);
      } catch (err: any) {
        toast.error(err?.message || "Failed to fetch packages");
      } finally {
        setLoading(false);
      }
    },
    [shopId, search, searchBy, categoryId, brandId, packageStatus, packageType]
  );

  useEffect(() => {
    loadPackages(1);
  }, [loadPackages]);

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
      setSelectedRows((prev) => [...prev, { ...row, unitPrice: 1 }]);
    } else {
      setSelectedRows((prev) => prev.filter((r) => r.id !== row.id));
    }
  };

  const updateUnitPrice = (id: string, value: number) => {
    setSelectedRows((prev) => prev.map((r) => (r.id === id ? { ...r, unitPrice: value } : r)));
  };

  const selectedIds = useMemo(() => selectedRows.map((r) => r.id), [selectedRows]);
  const otherShops = useMemo(() => shops.filter((s) => s.id !== shopId), [shops, shopId]);

  const handleSubmit = async () => {
    if (!shopId) return;
    if (!destinationShopId) {
      toast.error("Please select destination shop");
      return;
    }
    if (selectedRows.length === 0) {
      toast.error("Please select at least one package to complete the transfer");
      return;
    }
    setSubmitting(true);
    try {
      await createStoreToStoreTransfer(shopId, {
        toShopId: destinationShopId,
        notes,
        documentLinks,
        packages: selectedRows.map((row) => ({
          id: row.id,
          unitPrice: row.unitPrice ?? 1,
          advertisedId: row.advertisedId,
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 border-b border-border pb-4">
        <span className="text-base font-medium text-foreground">Transfer Information</span>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-foreground">
            Destination Shop <span className="text-destructive">*</span>
          </span>
          <Select
            items={[
              { value: "__none__", label: "Select shop" },
              ...otherShops.map((s) => ({ value: s.id, label: s.name })),
            ]}
            value={destinationShopId ?? undefined}
            onValueChange={(v) => setDestinationShopId(v as string)}
          >
            <SelectTrigger className="h-10! w-56 bg-white dark:bg-input/30">
              <SelectValue placeholder="Select shop" />
            </SelectTrigger>
            <SelectContent>
              {otherShops.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                  <Inbox className="size-8 text-muted-foreground/50" />
                  <span className="text-sm text-muted-foreground">No data</span>
                </div>
              ) : (
                otherShops.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-sm text-foreground">Notes</span>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes for your transfer"
            rows={2}
            className="bg-white dark:bg-input/30"
          />
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <span className="text-sm text-foreground">Upload Documents</span>
          <DocumentsUpload links={documentLinks} onChange={setDocumentLinks} variant="button" />
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
          {selectedRows.length > 0 && (
            <div className="flex flex-col gap-2 p-4 pb-0">
              <span className="text-xs font-medium text-muted-foreground">Unit price per selected package</span>
              <div className="flex flex-wrap gap-2">
                {selectedRows.map((row) => (
                  <div key={row.id} className="flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1 text-sm">
                    <span className="max-w-32 truncate">{row.advertisedId}</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.unitPrice ?? 1}
                      onChange={(e) => updateUnitPrice(row.id, parseFloat(e.target.value) || 0)}
                      className="h-7 w-20"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <PackagePickerTable
            rows={rows}
            loading={loading}
            selectedIds={selectedIds}
            onToggle={toggleRow}
            page={page}
            totalPages={totalPages}
            totalEntries={totalEntries}
            pageSize={PAGE_SIZE}
            onPageChange={loadPackages}
          />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex justify-end rounded-b-xl border-t border-border/70 bg-card px-6 py-3">
        <Button
          className="h-10! text-sm!"
          disabled={submitting || selectedRows.length === 0 || !destinationShopId}
          onClick={handleSubmit}
        >
          {submitting && <Loader2 className="size-3.5 animate-spin" />}
          Create Transfer {selectedRows.length > 0 && `(${selectedRows.length})`}
        </Button>
      </div>
    </div>
  );
}
