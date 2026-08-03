"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { fetchDealsList } from "@/services/deals/list";
import { removeRegularDeal } from "@/services/deals/regular/remove";
import { removeBogoDeal } from "@/services/deals/bogo/remove";
import { removeTieredDeal } from "@/services/deals/tiered/remove";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

import DealFormDrawer from "./DealFormDrawer";
import DealDetailsPanel from "./DealDetailsPanel";
import type { DealRow, DealType } from "./types";
import { DEAL_TYPE_BADGE_VARIANT } from "@/services/promotions/enums";

const PAGE_SIZE = 10;

const REMOVERS: Record<DealType, (id: string | number) => Promise<any>> = {
  REGULAR: removeRegularDeal,
  BOGO: removeBogoDeal,
  TIERED: removeTieredDeal,
};

export default function DealsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("id");
  const openType = searchParams.get("type") as DealType | null;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [allRows, setAllRows] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; dealId: string | null; dealType: DealType | null }>({
    open: false,
    mode: "add",
    dealId: null,
    dealType: null,
  });

  const [deleteTarget, setDeleteTarget] = useState<DealRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDealsList();
      setAllRows(res?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load deals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return allRows;
    return allRows.filter((r) => r.name?.toLowerCase().includes(term));
  }, [allRows, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openDetail = (row: DealRow) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", row.id);
    params.set("type", row.type);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const closeDetail = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    params.delete("type");
    const qs = params.toString();
    router.push(qs ? `?${qs}` : ".", { scroll: false });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await REMOVERS[deleteTarget.type](deleteTarget.id);
      toast.success("Deal deleted successfully");
      setDeleteTarget(null);
      if (String(openId) === String(deleteTarget.id)) closeDetail();
      loadDeals();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete deal");
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
            <Input placeholder="Search deals" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>

          <Button onClick={() => setDrawer({ open: true, mode: "add", dealId: null, dealType: null })}>
            <Plus /> Add Deal
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && allRows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
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
                    No deals found.
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
                    <button onClick={() => openDetail(row)} className="cursor-pointer text-left text-primary hover:underline">
                      {row.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={DEAL_TYPE_BADGE_VARIANT[row.type]}>{row.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => openDetail(row)} className="cursor-pointer text-primary hover:underline">
                      {row.onGoingTotalUsage ?? 0}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setDrawer({ open: true, mode: "edit", dealId: row.id, dealType: row.type })}
                      >
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

      {openId && openType && (
        <DealDetailsPanel
          dealId={openId}
          dealType={openType}
          onClose={closeDetail}
          onEdit={() => setDrawer({ open: true, mode: "edit", dealId: openId, dealType: openType })}
        />
      )}

      <DealFormDrawer
        open={drawer.open}
        mode={drawer.mode}
        dealId={drawer.dealId}
        dealType={drawer.dealType}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={loadDeals}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
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
