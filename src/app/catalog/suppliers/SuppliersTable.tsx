"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { fetchSuppliersList } from "@/services/suppliers/list";
import { removeSupplier } from "@/services/suppliers/remove";
import { fetchSupplierTypes } from "@/services/supplierTypes/list";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

import SupplierFormDrawer from "./SupplierFormDrawer";
import SupplierDetailsPanel from "./SupplierDetailsPanel";
import type { PaginationState, SupplierRow, SupplierTypeOption } from "./types";

const PAGE_SIZE = 10;

export default function SuppliersTable() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [supplierTypeId, setSupplierTypeId] = useState<string>("all");
  const [supplierTypes, setSupplierTypes] = useState<SupplierTypeOption[]>([]);

  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: PAGE_SIZE,
    totalEntries: 0,
    totalPages: 0,
  });

  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; supplierId: string | number | null }>({
    open: false,
    mode: "add",
    supplierId: null,
  });

  const [detailId, setDetailId] = useState<string | number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchSupplierTypes().then((res) => setSupplierTypes(res?.data ?? []));
  }, []);

  const loadSuppliers = useCallback(async (page = 1, searchTerm = "", typeId = "all") => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: PAGE_SIZE };
      if (searchTerm) params.search = searchTerm;
      if (typeId && typeId !== "all") params.supplierTypeId = typeId;
      const res = await fetchSuppliersList(params);
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
      toast.error(err?.message || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers(1, debouncedSearch, supplierTypeId);
  }, [loadSuppliers, debouncedSearch, supplierTypeId]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeSupplier(deleteTarget.id);
      toast.success("Supplier deleted successfully");
      setDeleteTarget(null);
      if (String(detailId) === String(deleteTarget.id)) setDetailId(null);
      loadSuppliers(pagination.page, debouncedSearch, supplierTypeId);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete supplier");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex gap-4 p-6">
      <div className={detailId ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Suppliers</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button onClick={() => setDrawer({ open: true, mode: "add", supplierId: null })}>
            <Plus /> Add Supplier
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search Suppliers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={supplierTypeId} onValueChange={setSupplierTypeId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Supplier type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {supplierTypes.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Vendor/Supplier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone Number</TableHead>
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
                    No suppliers found.
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
                    <TableCell>{row.supplierType || "-"}</TableCell>
                    <TableCell>{row.email || "-"}</TableCell>
                    <TableCell>{row.phone || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => setDrawer({ open: true, mode: "edit", supplierId: row.id })}
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
            onPageChange={(p) => loadSuppliers(p, debouncedSearch, supplierTypeId)}
          />
        )}
      </div>

      {detailId && (
        <SupplierDetailsPanel
          supplierId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={() => setDrawer({ open: true, mode: "edit", supplierId: detailId })}
        />
      )}

      <SupplierFormDrawer
        open={drawer.open}
        mode={drawer.mode}
        supplierId={drawer.supplierId}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={() => loadSuppliers(pagination.page, debouncedSearch, supplierTypeId)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
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
