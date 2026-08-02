"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchShopsData } from "@/services/shops/list";
import { fetchPackagesMinimalExtended } from "@/services/packages/listMinimalExtended";
import { createStoreToStoreTransfer } from "@/services/transfers/createStoreToStoreTransfer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<PackagePickerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  const [selectedRows, setSelectedRows] = useState<(PackagePickerRow & { unitPrice?: number })[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchShopsData().then((res) => setShops(res?.data ?? []));
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
        if (search) params.packageName = search;
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
    [shopId, search]
  );

  useEffect(() => {
    loadPackages(1);
  }, [loadPackages]);

  const toggleRow = (row: PackagePickerRow, checked: boolean) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, { ...row, unitPrice: 1 }]);
    } else {
      setSelectedRows((prev) => prev.filter((r) => r.id !== row.id));
    }
  };

  const updateUnitPrice = (id: string, value: number) => {
    setSelectedRows((prev) => prev.map((r) => (r.id === id ? { ...r, unitPrice: value } : r)));
  };

  const selectedIds = useMemo(() => selectedRows.map((r) => r.id), [selectedRows]);

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
        documentLinks: [],
        packages: selectedRows.map((row) => ({
          id: row.id,
          unitPrice: row.unitPrice ?? 1,
          advertisedId: row.advertisedId,
        })),
      });
      toast.success("Transfer created successfully");
      router.push("/admin/inventory/transfers");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create transfer, please try again!");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-muted/40 p-4">
        <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Transfer Information</p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Destination Shop <span className="text-destructive">*</span>
            </p>
            <Select
              items={[
                { value: "__none__", label: "Select shop" },
                ...shops.filter((s) => s.id !== shopId).map((s) => ({ value: s.id, label: s.name })),
              ]}
              value={destinationShopId ?? undefined}
              onValueChange={(v) => setDestinationShopId(v as string)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select shop" />
              </SelectTrigger>
              <SelectContent>
                {shops
                  .filter((s) => s.id !== shopId)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-52 flex-1">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes for your transfer" rows={1} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">Select Packages For Transfer</span>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge>{selectedIds.length} selected</Badge>
              <Button variant="outline" size="sm" onClick={() => setSelectedRows([])}>
                Clear
              </Button>
            </div>
          )}
        </div>

        <Input
          placeholder="Search by package name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-56"
        />

        {selectedRows.length > 0 && (
          <div className="flex flex-col gap-2">
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

      <div className="flex justify-end">
        <Button disabled={submitting || selectedRows.length === 0 || !destinationShopId} onClick={handleSubmit}>
          {submitting && <Loader2 className="size-3.5 animate-spin" />}
          Create Transfer {selectedRows.length > 0 && `(${selectedRows.length})`}
        </Button>
      </div>
    </div>
  );
}
