"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { fetchRolesList } from "@/services/roles/list";
import { deleteRole } from "@/services/roles/deleteRole";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import RoleFormDrawer from "./RoleFormDrawer";

export default function RolesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 30, total: 0, totalPages: 1 });
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await fetchRolesList({ page, limit: pagination.pageSize });
        setRows(res?.data?.roles ?? []);
        const pd = res?.data?.paginationData ?? {};
        setPagination((prev) => ({
          current: pd.currentPage ?? page,
          pageSize: pd.limit ?? prev.pageSize,
          total: pd.totalEntries ?? 0,
          totalPages: pd.totalPages ?? 1,
        }));
      } finally {
        setLoading(false);
      }
    },
    [pagination.pageSize]
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteRole(deleteTarget.id);
      toast.success("Role deleted successfully");
      setDeleteTarget(null);
      load(pagination.current);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete role");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Access Management</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Roles</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add Role
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && rows.length > 0} />
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Role Name</TableHead>
              <TableHead className="text-center">Color</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              rows.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-b-0">
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
                  No roles found.
                </TableCell>
              </TableRow>
            )}

            {rows.map((row, i) => (
              <TableRow
                key={row.id}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
              >
                <TableCell
                  className="cursor-pointer font-medium hover:underline"
                  onClick={() => setEditTarget(row)}
                >
                  {row.name}
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-block size-4 rounded-full ring-1 ring-foreground/10" style={{ backgroundColor: row.colorCode }} />
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                      Actions <ChevronDown className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        className="gap-2 whitespace-nowrap"
                        onClick={() => setEditTarget(row)}
                      >
                        <Pencil className="size-4 text-sky-600" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 whitespace-nowrap" variant="destructive" onClick={() => setDeleteTarget(row)}>
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={pagination.current}
        totalPages={pagination.totalPages}
        totalEntries={pagination.total}
        pageSize={pagination.pageSize}
        loading={loading}
        onPageChange={(p: number) => load(p)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role &quot;{deleteTarget?.name}&quot;? This cannot be undone.
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

      <RoleFormDrawer open={addOpen} mode="add" roleId={null} onClose={() => setAddOpen(false)} onSaved={() => load(pagination.current)} />

      <RoleFormDrawer
        open={!!editTarget}
        mode="edit"
        roleId={editTarget?.id ?? null}
        onClose={() => setEditTarget(null)}
        onSaved={() => load(pagination.current)}
      />
    </div>
  );
}
