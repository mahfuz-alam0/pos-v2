"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Search, Trash2 } from "lucide-react";

import { fetchMatrixAttributesList } from "@/services/matrixAttributes/list";
import { removeMatrixAttribute } from "@/services/matrixAttributes/remove";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useDebounce } from "@/hooks/useDebounce";

import AttributeDetailsPanel from "./AttributeDetailsPanel";
import type { AttributeRow, PaginationState } from "./types";

const PAGE_SIZE = 10;

export default function AttributesTable({
  refreshKey,
  onEdit,
}: {
  refreshKey: number;
  onEdit: (id: string | number) => void;
}) {
  const [rows, setRows] = useState<AttributeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: PAGE_SIZE,
    totalEntries: 0,
    totalPages: 0,
  });

  const [detailId, setDetailId] = useState<string | number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AttributeRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async (page = 1, term = "") => {
    setLoading(true);
    try {
      const res = await fetchMatrixAttributesList({ page, limit: PAGE_SIZE, ...(term ? { search: term } : {}) });
      setRows(res?.data ?? []);
      const p = res?.paginationData;
      if (p) {
        setPagination({
          page: p.currentPage ?? page,
          limit: p.limit ?? PAGE_SIZE,
          totalEntries: p.totalEntries ?? 0,
          totalPages: p.totalPages ?? 0,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load attributes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, refreshKey]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeMatrixAttribute(deleteTarget.id);
      toast.success("Matrix attribute deleted successfully");
      setDeleteTarget(null);
      if (String(detailId) === String(deleteTarget.id)) setDetailId(null);
      load(pagination.page, debouncedSearch);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete attribute");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex gap-4">
      <div className={detailId ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by attribute name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                rows.length === 0 &&
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
                    No attributes found.
                  </TableCell>
                </TableRow>
              )}

              {rows.length > 0 &&
                rows.map((row, i) => (
                  <TableRow
                    key={row.id}
                    data-active={detailId === row.id}
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] data-[active=true]:bg-muted/40 ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                  >
                    <TableCell className="font-medium">
                      <button
                        onClick={() => setDetailId(row.id)}
                        className="cursor-pointer text-left text-primary hover:underline"
                      >
                        {row.name}
                      </button>
                    </TableCell>
                    <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="icon-sm" onClick={() => onEdit(row.id)}>
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

        {pagination.totalEntries > 0 && (
          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalEntries={pagination.totalEntries}
            pageSize={pagination.limit}
            loading={loading}
            onPageChange={(p) => load(p, debouncedSearch)}
          />
        )}
      </div>

      {detailId && (
        <AttributeDetailsPanel
          attributeId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={() => onEdit(detailId)}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Matrix Attribute</AlertDialogTitle>
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
