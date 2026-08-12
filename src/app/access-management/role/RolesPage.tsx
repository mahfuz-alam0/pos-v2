"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2, Pencil, Trash2 } from "lucide-react";

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
import { useSettings } from "@/context/settings-context";

export default function RolesPage() {
  const { defaultPageSize } = useSettings();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: defaultPageSize, total: 0, totalPages: 1 });
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const load = useCallback(
    async (page = 1, size = pagination.pageSize) => {
      setLoading(true);
      try {
        const res = await fetchRolesList({ page, limit: size });
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
    <div className="flex gap-4 p-3">
      <div className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card px-4 py-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Access Management</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-primary">Roles</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button className="h-9! rounded! px-3.5! text-[14px]! font-normal!" onClick={() => setAddOpen(true)}>
            Add Role
          </Button>
        </div>

        <div className="relative -mx-4">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table className="text-[14px]">
            <TableHeader className="bg-muted/60 [&_tr]:border-b-0 [&_th]:h-13 [&_th]:px-4 [&_th]:font-normal [&_th]:text-foreground/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-1/4">Role Name</TableHead>
                <TableHead className="w-56 text-center">Color Code</TableHead>
                <TableHead className="w-40 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-foreground/70 [&_td]:h-18 [&_td]:px-4">
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

              {rows.map((row) => (
                <TableRow key={row.id} className="border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                  <TableCell
                    className="cursor-pointer font-normal"
                    onClick={() => setEditTarget(row)}
                  >
                    {row.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2 font-medium">
                      <span className="inline-block size-4 shrink-0 rounded-full ring-1 ring-foreground/10" style={{ backgroundColor: row.colorCode }} />
                      {row.colorCode}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="outline" className="h-9! bg-card! px-4! text-sm!" />}>
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
                    </div>
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
          compact
          pageSizeOptions={[30, 50, 100, 200]}
          onPageSizeChange={(s) => {
            setPagination((prev) => ({ ...prev, pageSize: s, current: 1 }));
            load(1, s);
          }}
        />
      </div>

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
