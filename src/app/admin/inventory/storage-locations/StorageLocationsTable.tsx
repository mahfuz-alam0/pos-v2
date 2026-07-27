"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchStorageLocations } from "@/services/storageLocations/list";

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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import StorageLocationDetails from "./StorageLocationDetails";
import StorageLocationDrawer from "./StorageLocationDrawer";

interface StorageLocationRow {
  id: string | number;
  name: string;
  openForAcceptingTransfers: boolean;
  isSellableOnPhysicalStore: boolean;
  shopId: string | number;
}

export default function StorageLocationsTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shopId } = useShop();

  const openId = searchParams.get("id");

  const [rows, setRows] = useState<StorageLocationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; locationId: string | number | null }>({
    open: false,
    mode: "add",
    locationId: null,
  });

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
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Failed to load storage locations");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

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

  return (
    <div className="flex gap-4 p-6">
      <div className={openId ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/inventory">Inventory</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Storage Locations</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button onClick={() => setDrawer({ open: true, mode: "add", locationId: null })}>
            <Plus /> Add Storage Location
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Location Name</TableHead>
                <TableHead>Default Package Destination</TableHead>
                <TableHead>Sellable In Physical Store</TableHead>
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
                    No storage locations found.
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
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setDrawer({ open: true, mode: "edit", locationId: row.id })}
                      >
                        <Pencil />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {openId && (
        <StorageLocationDetails locationId={openId} onClose={closeDetail} />
      )}

      <StorageLocationDrawer
        open={drawer.open}
        mode={drawer.mode}
        locationId={drawer.locationId}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={loadLocations}
      />
    </div>
  );
}
