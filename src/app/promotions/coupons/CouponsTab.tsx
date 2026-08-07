"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { fetchCouponsList } from "@/services/coupons/list";
import { removeCoupon } from "@/services/coupons/remove";
import { fetchShopsData } from "@/services/shops/list";
import { listCustomerTypes } from "@/services/customers/listCustomerTypes";
import { listCustomerGroups } from "@/services/customers/listCustomerGroups";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { MultiApiSelect } from "@/components/ui/multi-api-select";
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

import CouponFormDrawer from "./CouponFormDrawer";
import CouponDetailsPanel from "./CouponDetailsPanel";
import type { CouponRow } from "./types";

const PAGE_SIZE = 10;

const DELIVERY_METHOD_OPTIONS = [
  { id: "IN_STORE", name: "In Store" },
  { id: "PICK_UP", name: "PickUp" },
  { id: "DELIVERY", name: "Delivery" },
];

type CouponFilters = {
  shopIds: string[];
  customerTypeIds: string[];
  customerGroupIds: string[];
  deliveryMethods: string[];
};

const DEFAULT_FILTERS: CouponFilters = { shopIds: [], customerTypeIds: [], customerGroupIds: [], deliveryMethods: [] };

export default function CouponsTab() {
  const [openId, setOpenId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filters, setFilters] = useState<CouponFilters>(DEFAULT_FILTERS);

  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [customerTypes, setCustomerTypes] = useState<{ id: string; name: string }[]>([]);
  const [customerGroups, setCustomerGroups] = useState<{ id: string; name: string }[]>([]);

  const [allRows, setAllRows] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; couponId: string | null }>({
    open: false,
    mode: "add",
    couponId: null,
  });

  const [deleteTarget, setDeleteTarget] = useState<CouponRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.shopIds.length) params.shopIds = filters.shopIds;
      if (filters.customerTypeIds.length) params.customerTypeIds = filters.customerTypeIds;
      if (filters.customerGroupIds.length) params.customerGroupIds = filters.customerGroupIds;
      if (filters.deliveryMethods.length) params.deliveryMethods = filters.deliveryMethods;

      const res = await fetchCouponsList(params);
      setAllRows(res?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  useEffect(() => {
    fetchShopsData().then((res) => setShops(res?.data ?? []));
    listCustomerTypes().then((res) => setCustomerTypes(res?.data?.data?.customerTypes ?? []));
    listCustomerGroups().then((res) => setCustomerGroups(res?.data?.data?.customerGroups ?? []));
  }, []);

  const hasActiveFilters =
    debouncedSearch ||
    filters.shopIds.length > 0 ||
    filters.customerTypeIds.length > 0 ||
    filters.customerGroupIds.length > 0 ||
    filters.deliveryMethods.length > 0;

  const clearFilters = () => {
    setSearch("");
    setFilters(DEFAULT_FILTERS);
  };

  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const rows = allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openDetail = (id: string | number) => {
    setOpenId(String(id));
  };

  const closeDetail = () => {
    setOpenId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeCoupon(deleteTarget.id);
      toast.success("Coupon deleted successfully");
      setDeleteTarget(null);
      if (String(openId) === String(deleteTarget.id)) closeDetail();
      loadCoupons();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete coupon");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex gap-4">
      <div className={openId ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search coupons"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <Button onClick={() => setDrawer({ open: true, mode: "add", couponId: null })}>
            <Plus /> Add Coupon
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MultiApiSelect
            placeholder="Select Delivery Methods"
            value={filters.deliveryMethods}
            onChange={(ids) => setFilters((prev) => ({ ...prev, deliveryMethods: ids }))}
            items={DELIVERY_METHOD_OPTIONS}
          />
          <MultiApiSelect
            placeholder="Select Shops"
            value={filters.shopIds}
            onChange={(ids) => setFilters((prev) => ({ ...prev, shopIds: ids }))}
            items={shops}
          />
          <MultiApiSelect
            placeholder="Select Customer Types"
            value={filters.customerTypeIds}
            onChange={(ids) => setFilters((prev) => ({ ...prev, customerTypeIds: ids }))}
            items={customerTypes}
          />
          <MultiApiSelect
            placeholder="Select Customer Groups"
            value={filters.customerGroupIds}
            onChange={(ids) => setFilters((prev) => ({ ...prev, customerGroupIds: ids }))}
            items={customerGroups}
          />
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Reset
            </Button>
          )}
        </div>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && allRows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Usage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                allRows.length === 0 &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow
                    key={`skeleton-${i}`}
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                  >
                    {Array.from({ length: 4 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No coupons found.
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  data-active={openId === String(row.id)}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] data-[active=true]:bg-muted/40 ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                >
                  <TableCell className="font-medium">
                    <button onClick={() => openDetail(row.id)} className="cursor-pointer text-left text-primary hover:underline">
                      {row.name}
                    </button>
                  </TableCell>
                  <TableCell>{row.couponCode}</TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => openDetail(row.id)} className="cursor-pointer text-primary hover:underline">
                      {row.onGoingTotalUsage ?? 0}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="icon-sm" onClick={() => setDrawer({ open: true, mode: "edit", couponId: row.id })}>
                        <Pencil />
                      </Button>
                      <Button variant="outline" size="icon-sm" onClick={() => setDeleteTarget(row)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {allRows.length > 0 && (
          <TablePagination page={page} totalPages={totalPages} totalEntries={allRows.length} pageSize={PAGE_SIZE} loading={loading} onPageChange={setPage} />
        )}
      </div>

      {openId && (
        <CouponDetailsPanel
          couponId={openId}
          onClose={closeDetail}
          onEdit={() => setDrawer({ open: true, mode: "edit", couponId: openId })}
        />
      )}

      <CouponFormDrawer
        open={drawer.open}
        mode={drawer.mode}
        couponId={drawer.couponId}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={loadCoupons}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
