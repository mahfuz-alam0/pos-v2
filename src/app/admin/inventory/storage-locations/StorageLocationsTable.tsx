"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchStorageLocations } from "@/services/storageLocations/list";
import { deleteStorageLocation } from "@/services/storageLocations/deleteLocation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function StorageLocationsTable() {
  const router = useRouter();
  const { shopId } = useShop();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadLocations = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchStorageLocations(shopId);
      const locations = res?.data?.data?.locations ?? [];
      setRows(
        locations.map((location) => ({
          id: location.id,
          name: location.name,
          openForAcceptingTransfers: location.openForAcceptingTransfers,
          isSellableOnPhysicalStore: location.isSellableOnPhysicalStore,
          shopId: location.shopId,
        }))
      );
    } catch (err) {
      toast.error(err?.message || "Failed to load storage locations");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteStorageLocation(deleteTarget.id, deleteTarget.shopId);
      toast.success("Storage location deleted successfully");
      setDeleteTarget(null);
      loadLocations();
    } catch (err) {
      toast.error(err?.message || "Failed to delete storage location");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Storage Locations</h1>
        <Button onClick={() => router.push("/admin/inventory/storage-locations/add")}>
          <Plus /> Add Storage Location
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="border-b-0 bg-muted/60">
              <TableHead>Location Name</TableHead>
              <TableHead>Default Package Destination</TableHead>
              <TableHead>Sellable In Physical Store</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No storage locations found.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              rows.map((row, i) => (
                <TableRow key={row.id} className={`border-b-0 ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/inventory/storage-locations/edit/${row.id}`}
                      className="hover:underline"
                    >
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.openForAcceptingTransfers ? "default" : "secondary"}>
                      {row.openForAcceptingTransfers ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.isSellableOnPhysicalStore ? "default" : "secondary"}>
                      {row.isSellableOnPhysicalStore ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => router.push(`/admin/inventory/storage-locations/edit/${row.id}`)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(row)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete storage location</DialogTitle>
            <DialogDescription>
              Do you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
