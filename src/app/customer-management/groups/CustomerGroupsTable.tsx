"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Pencil, Plus, Settings, Trash2 } from "lucide-react";

import { fetchCustomerGroups } from "@/services/customerGroups/list";
import { removeCustomerGroup } from "@/services/customerGroups/remove";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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

import GroupFormDrawer from "./GroupFormDrawer";
import type { CustomerGroupRow } from "./types";

export default function CustomerGroupsTable() {
  const router = useRouter();
  const [rows, setRows] = useState<CustomerGroupRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; groupId: string | number | null }>({
    open: false,
    mode: "add",
    groupId: null,
  });

  const [deleteTarget, setDeleteTarget] = useState<CustomerGroupRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCustomerGroups();
      setRows(res?.data?.data?.customerGroups ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load customer groups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeCustomerGroup(deleteTarget.id);
      toast.success("Customer group deleted successfully");
      setDeleteTarget(null);
      loadGroups();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete customer group");
    } finally {
      setDeleteLoading(false);
    }
  };

  const goToSettings = (row: CustomerGroupRow) => {
    const isIdentifier = row.systemGeneratedIdentifier === "MJ_MEDICAL";
    router.push(`/customer-management/groups/settings/${row.id}?isIdentifier=${isIdentifier}`);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Customer Management</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Customer Groups</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button onClick={() => setDrawer({ open: true, mode: "add", groupId: null })}>
          <Plus /> Add Group
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Group Name</TableHead>
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
                  No customer groups found.
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
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="outline" size="icon-sm">
                            <MoreHorizontal />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        {!row.systemGeneratedIdentifier && (
                          <>
                            <DropdownMenuItem
                              onClick={() => setDrawer({ open: true, mode: "edit", groupId: row.id })}
                            >
                              <Pencil /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteTarget(row)}>
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => goToSettings(row)}>
                          <Settings /> Settings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <GroupFormDrawer
        open={drawer.open}
        mode={drawer.mode}
        groupId={drawer.groupId}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={loadGroups}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer Group</AlertDialogTitle>
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
