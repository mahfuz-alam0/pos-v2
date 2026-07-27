"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { fetchBrandsList } from "@/services/brands/list";
import { removeBrand } from "@/services/brands/remove";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
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

import ManufacturerFormDrawer from "./ManufacturerFormDrawer";
import ManufacturerDetailsPanel from "./ManufacturerDetailsPanel";
import type { BrandRow, PaginationState } from "./types";

const PAGE_SIZE = 10;

export default function ManufacturersTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("id");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [rows, setRows] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: PAGE_SIZE,
    totalEntries: 0,
    totalPages: 0,
  });

  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; brandId: string | number | null }>({
    open: false,
    mode: "add",
    brandId: null,
  });

  const [deleteTarget, setDeleteTarget] = useState<BrandRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadBrands = useCallback(async (page = 1, searchTerm = "") => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: PAGE_SIZE };
      if (searchTerm) params.search = searchTerm;
      const res = await fetchBrandsList(params);
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
      toast.error(err?.message || "Failed to load manufacturers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrands(1, debouncedSearch);
  }, [loadBrands, debouncedSearch]);

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
      await removeBrand(deleteTarget.id);
      toast.success("Manufacturer deleted successfully");
      setDeleteTarget(null);
      if (String(openId) === String(deleteTarget.id)) closeDetail();
      loadBrands(pagination.page, debouncedSearch);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete manufacturer");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex gap-4 p-6">
      <div className={openId ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Catalog</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>Brands</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button onClick={() => setDrawer({ open: true, mode: "add", brandId: null })}>
            <Plus /> Add Brand
          </Button>
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search Brands"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Brands</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow
                    key={`skeleton-${i}`}
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                  >
                    {Array.from({ length: 3 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    No manufacturers found.
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                rows.map((row, i) => (
                  <TableRow
                    key={row.id}
                    data-active={openId === String(row.id)}
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] data-[active=true]:bg-muted/40 ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                  >
                    <TableCell className="font-medium">
                      <button
                        onClick={() => openDetail(row.id)}
                        className="cursor-pointer text-left text-primary hover:underline"
                      >
                        {row.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="line-clamp-1 max-w-md">{row.highlights || "-"}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => setDrawer({ open: true, mode: "edit", brandId: row.id })}
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

        {!loading && pagination.totalEntries > 0 && (
          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalEntries={pagination.totalEntries}
            pageSize={pagination.limit}
            loading={loading}
            onPageChange={(p) => loadBrands(p, debouncedSearch)}
          />
        )}
      </div>

      {openId && (
        <ManufacturerDetailsPanel
          brandId={openId}
          onClose={closeDetail}
          onEdit={() => setDrawer({ open: true, mode: "edit", brandId: openId })}
        />
      )}

      <ManufacturerFormDrawer
        open={drawer.open}
        mode={drawer.mode}
        brandId={drawer.brandId}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={() => loadBrands(pagination.page, debouncedSearch)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Manufacturer</AlertDialogTitle>
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
