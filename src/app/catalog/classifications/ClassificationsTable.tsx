"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { fetchClassificationsList } from "@/services/classifications/list";
import { removeClassification } from "@/services/classifications/remove";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

import ClassificationFormDrawer from "./ClassificationFormDrawer";
import ClassificationDetailsPanel from "./ClassificationDetailsPanel";
import type { ClassificationRow, PaginationState } from "./types";
import { useSettings } from "@/context/settings-context";


export default function ClassificationsTable() {
  const { defaultPageSize } = useSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("id");

  const [rows, setRows] = useState<ClassificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: defaultPageSize,
    totalEntries: 0,
    totalPages: 0,
  });

  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; classificationId: string | number | null }>({
    open: false,
    mode: "add",
    classificationId: null,
  });

  const [deleteTarget, setDeleteTarget] = useState<ClassificationRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadClassifications = useCallback(async (page = 1, size = pagination.limit) => {
    setLoading(true);
    try {
      const res = await fetchClassificationsList({ page, limit: size });
      setRows(res?.data ?? []);
      const p = res?.paginationData;
      if (p) {
        setPagination({
          page: p.currentPage ?? page,
          limit: p.limit ?? size,
          totalEntries: p.totalEntries ?? 0,
          totalPages: p.totalPages ?? 0,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load classifications");
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => {
    loadClassifications(1);
  }, [loadClassifications]);

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
      await removeClassification(deleteTarget.id);
      toast.success("Classification deleted successfully");
      setDeleteTarget(null);
      if (String(openId) === String(deleteTarget.id)) closeDetail();
      loadClassifications(pagination.page);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete classification");
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
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Classifications</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button onClick={() => setDrawer({ open: true, mode: "add", classificationId: null })}>
            <Plus /> Add Classification
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Is Mj</TableHead>
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
                    No classifications found.
                  </TableCell>
                </TableRow>
              )}

              {rows.length > 0 &&
                rows.map((row, i) => (
                  <TableRow
                    key={row.id}
                    data-active={openId === String(row.id)}
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] data-[active=true]:bg-muted/40 ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
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
                      <div className="line-clamp-1 max-w-md">{row.details || "-"}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.isMJ ? "default" : "secondary"}>{row.isMJ ? "Yes" : "No"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => setDrawer({ open: true, mode: "edit", classificationId: row.id })}
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
            onPageChange={(p) => loadClassifications(p)}
            pageSizeOptions={[30, 50, 100, 200]}
            onPageSizeChange={(s) => {
              setPagination((prev) => ({ ...prev, limit: s, page: 1 }));
              loadClassifications(1, s);
            }}
          />
        )}
      </div>

      {openId && (
        <ClassificationDetailsPanel
          classificationId={openId}
          onClose={closeDetail}
          onEdit={() => setDrawer({ open: true, mode: "edit", classificationId: openId })}
        />
      )}

      <ClassificationFormDrawer
        open={drawer.open}
        mode={drawer.mode}
        classificationId={drawer.classificationId}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={() => loadClassifications(pagination.page)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Classification</AlertDialogTitle>
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
