"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Leaf, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { fetchStrainsList } from "@/services/strains/list";
import { removeStrain } from "@/services/strains/remove";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
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

import StrainFormDrawer from "./StrainFormDrawer";
import type { PaginationState, StrainRow } from "./types";

const PAGE_SIZE = 10;

export default function StrainsTable() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [rows, setRows] = useState<StrainRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: PAGE_SIZE,
    totalEntries: 0,
    totalPages: 0,
  });

  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; strainId: string | number | null }>({
    open: false,
    mode: "add",
    strainId: null,
  });

  const [deleteTarget, setDeleteTarget] = useState<StrainRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadStrains = useCallback(async (page = 1, searchTerm = "") => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: PAGE_SIZE };
      if (searchTerm) params.search = searchTerm;
      const res = await fetchStrainsList(params);
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
      toast.error(err?.message || "Failed to load strains");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStrains(1, debouncedSearch);
  }, [loadStrains, debouncedSearch]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeStrain(deleteTarget.id);
      toast.success("Strain deleted successfully");
      setDeleteTarget(null);
      loadStrains(pagination.page, debouncedSearch);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete strain");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Strains</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button onClick={() => setDrawer({ open: true, mode: "add", strainId: null })}>
          <Plus /> Add Strain
        </Button>
      </div>

      <div className="relative w-full max-w-xs">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search Strains"
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
              <TableHead className="w-14">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
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
                  No strains found.
                </TableCell>
              </TableRow>
            )}

            {rows.length > 0 &&
              rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                >
                  <TableCell>
                    {row.imageUrl ? (
                      <img
                        src={row.imageUrl}
                        alt=""
                        className="size-10 rounded-lg object-cover ring-1 ring-foreground/10"
                      />
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-lg bg-muted ring-1 ring-foreground/10">
                        <Leaf className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <div className="line-clamp-1 max-w-md">{row.description || "-"}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setDrawer({ open: true, mode: "edit", strainId: row.id })}
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

      {pagination.totalEntries > 0 && (
        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalEntries={pagination.totalEntries}
          pageSize={pagination.limit}
          loading={loading}
          onPageChange={(p) => loadStrains(p, debouncedSearch)}
        />
      )}

      <StrainFormDrawer
        open={drawer.open}
        mode={drawer.mode}
        strainId={drawer.strainId}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={() => loadStrains(pagination.page, debouncedSearch)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Strain</AlertDialogTitle>
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
