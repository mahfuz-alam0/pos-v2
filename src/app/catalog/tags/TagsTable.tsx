"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { fetchTagsList } from "@/services/tags/list";
import { removeTag } from "@/services/tags/remove";

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

import TagFormDrawer from "./TagFormDrawer";
import type { PaginationState, TagRow } from "./types";

const PAGE_SIZE = 10;

export default function TagsTable() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [rows, setRows] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: PAGE_SIZE,
    totalEntries: 0,
    totalPages: 0,
  });

  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; tagId: string | number | null }>({
    open: false,
    mode: "add",
    tagId: null,
  });

  const [deleteTarget, setDeleteTarget] = useState<TagRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadTags = useCallback(async (page = 1, searchTerm = "") => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: PAGE_SIZE };
      if (searchTerm) params.search = searchTerm;
      const res = await fetchTagsList(params);
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
      toast.error(err?.message || "Failed to load tags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags(1, debouncedSearch);
  }, [loadTags, debouncedSearch]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeTag(deleteTarget.id);
      toast.success("Tag deleted successfully");
      setDeleteTarget(null);
      loadTags(pagination.page, debouncedSearch);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete tag");
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
              <BreadcrumbPage>Tags</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button onClick={() => setDrawer({ open: true, mode: "add", tagId: null })}>
          <Plus /> Add Tag
        </Button>
      </div>

      <div className="relative w-full max-w-xs">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search Tags"
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
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
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
                  No tags found.
                </TableCell>
              </TableRow>
            )}

            {rows.length > 0 &&
              rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                >
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <div className="line-clamp-1 max-w-md">{row.description || "-"}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setDrawer({ open: true, mode: "edit", tagId: row.id })}
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
          onPageChange={(p) => loadTags(p, debouncedSearch)}
        />
      )}

      <TagFormDrawer
        open={drawer.open}
        mode={drawer.mode}
        tagId={drawer.tagId}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={() => loadTags(pagination.page, debouncedSearch)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
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
