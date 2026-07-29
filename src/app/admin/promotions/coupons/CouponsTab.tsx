"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { fetchCouponsList } from "@/services/coupons/list";
import { removeCoupon } from "@/services/coupons/remove";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
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

export default function CouponsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("id");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

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
      const res = await fetchCouponsList();
      setAllRows(res?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return allRows;
    return allRows.filter((r) => r.name?.toLowerCase().includes(term) || r.couponCode?.toLowerCase().includes(term));
  }, [allRows, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openDetail = (id: string | number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", String(id));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const closeDetail = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    const qs = params.toString();
    router.push(qs ? `?${qs}` : ".", { scroll: false });
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

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && allRows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
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
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                  >
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No coupons found.
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  data-active={openId === String(row.id)}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] data-[active=true]:bg-muted/40 ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                >
                  <TableCell className="font-medium">
                    <button onClick={() => openDetail(row.id)} className="cursor-pointer text-left text-primary hover:underline">
                      {row.name}
                    </button>
                  </TableCell>
                  <TableCell>{row.couponCode}</TableCell>
                  <TableCell>{(row as any).discountType === "PERCENTAGE" ? `${(row as any).discountRate}%` : `$${(row as any).discountRate ?? "-"}`}</TableCell>
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

        {filtered.length > 0 && (
          <TablePagination page={page} totalPages={totalPages} totalEntries={filtered.length} pageSize={PAGE_SIZE} loading={loading} onPageChange={setPage} />
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
