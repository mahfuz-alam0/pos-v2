"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Pencil, Plus, Settings, Trash2 } from "lucide-react";

import { listCustomerTypes } from "@/services/customers/listCustomerTypes";
import { removeCustomerType } from "@/services/customerTypes/remove";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

import RewardSettingsDrawer from "./RewardSettingsDrawer";
import TypeFormDrawer from "./TypeFormDrawer";
import type { CustomerTypeRow } from "./types";

export default function CustomerTypesTable() {
  const [rows, setRows] = useState<CustomerTypeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; typeId: string | number | null }>({
    open: false,
    mode: "add",
    typeId: null,
  });

  const [settingsTypeId, setSettingsTypeId] = useState<string | number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CustomerTypeRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCustomerTypes();
      setRows(res?.data?.data?.customerTypes ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load customer types");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeCustomerType(deleteTarget.id);
      toast.success("Customer type deleted successfully");
      setDeleteTarget(null);
      loadTypes();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete customer type");
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
              <BreadcrumbPage>Customer Management</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Customer Types &amp; Rewards</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button onClick={() => setDrawer({ open: true, mode: "add", typeId: null })}>
          <Plus /> Add Type
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Customer Type</TableHead>
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
                  No customer types found.
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
                        <DropdownMenuItem onClick={() => setDrawer({ open: true, mode: "edit", typeId: row.id })}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSettingsTypeId(row.id)}>
                          <Settings /> Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteTarget(row)}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <TypeFormDrawer
        open={drawer.open}
        mode={drawer.mode}
        typeId={drawer.typeId}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={loadTypes}
      />

      <RewardSettingsDrawer
        open={!!settingsTypeId}
        typeId={settingsTypeId}
        onClose={() => setSettingsTypeId(null)}
        onSaved={loadTypes}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer Type</AlertDialogTitle>
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
