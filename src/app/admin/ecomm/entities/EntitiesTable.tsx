"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Pencil, Trash2, Copy, Plus } from "lucide-react";

import { listBusinessEntities } from "@/services/businessEntities/list";
import { removeBusinessEntity } from "@/services/businessEntities/remove";
import { fetchShopsData } from "@/services/shops/list";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

import EntityFormDrawer from "./EntityFormDrawer";
import type { EntityRow, ShopOption } from "./types";

export default function EntitiesTable() {
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<ShopOption[]>([]);

  const [drawer, setDrawer] = useState<{ open: boolean; entity: EntityRow | null }>({
    open: false,
    entity: null,
  });

  const [deleteTarget, setDeleteTarget] = useState<EntityRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadEntities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBusinessEntities();
      const entities = res?.data?.data?.businessEntities ?? res?.data?.data ?? [];
      setRows(Array.isArray(entities) ? entities : []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch entities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntities();
    fetchShopsData().then((res) => setShops(res.data || []));
  }, [loadEntities]);

  const shopLabel = (id: string) => {
    const shop = shops.find((s: any) => s.id === id || s._id === id);
    return (shop as any)?.name || (shop as any)?.shopName || id;
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => toast.success("ID copied to clipboard"));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeBusinessEntity(deleteTarget.id);
      toast.success("Entity deleted successfully");
      setDeleteTarget(null);
      loadEntities();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete entity");
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
              <BreadcrumbPage>Online Ordering</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Ecom Entities</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button onClick={() => setDrawer({ open: true, entity: null })}>
          <Plus /> Add Entity
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Entity</TableHead>
              <TableHead>Associated Shops</TableHead>
              <TableHead>Shop Count</TableHead>
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
                  No entities yet — add one to get started.
                </TableCell>
              </TableRow>
            )}

            {rows.length > 0 &&
              rows.map((row, i) => {
                const ids = row.associatedTenantIds || [];
                return (
                  <TableRow
                    key={row.id}
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                  >
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>
                      {ids.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No shops assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {ids.slice(0, 3).map((id) => (
                            <Badge key={id} variant="outline">
                              {shopLabel(id)}
                            </Badge>
                          ))}
                          {ids.length > 3 && (
                            <Badge variant="secondary" title={ids.slice(3).map(shopLabel).join(", ")}>
                              +{ids.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ids.length > 0 ? "default" : "secondary"}>
                        {ids.length} {ids.length === 1 ? "shop" : "shops"}
                      </Badge>
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
                          <DropdownMenuItem onClick={() => handleCopyId(row.id)}>
                            <Copy /> Copy ID
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDrawer({ open: true, entity: row })}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteTarget(row)}>
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <EntityFormDrawer
        open={drawer.open}
        entity={drawer.entity}
        shops={shops}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={loadEntities}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entity</AlertDialogTitle>
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
