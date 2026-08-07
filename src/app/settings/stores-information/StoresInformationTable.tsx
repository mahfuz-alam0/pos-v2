"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { fetchShopsData } from "@/services/shops/list";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

import StoreDetailsPanel from "./StoreDetailsPanel";
import StoreEditDrawer from "./StoreEditDrawer";
import type { StoreRow } from "./types";

export default function StoresInformationTable() {
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailId, setDetailId] = useState<string | number | null>(null);
  const [editId, setEditId] = useState<string | number | null>(null);

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchShopsData();
      setRows(
        (res?.data ?? []).map((shop: any) => ({
          id: shop.id,
          name: shop.name,
          location: shop.locationString ?? "n/a",
          email: shop.shopEmail ?? "n/a",
          mobile: shop.phone ?? "n/a",
        })),
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to load stores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  return (
    <div className="flex gap-4 p-6">
      <div className={detailId ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Store Information</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Store Name</TableHead>
                <TableHead>Store Location</TableHead>
                <TableHead>Phone No.</TableHead>
                <TableHead>Email ID</TableHead>
                <TableHead className="text-right">Action</TableHead>
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
                    No stores found.
                  </TableCell>
                </TableRow>
              )}

              {rows.length > 0 &&
                rows.map((row, i) => (
                  <TableRow
                    key={row.id}
                    data-active={detailId === row.id}
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] data-[active=true]:bg-muted/40 ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                  >
                    <TableCell className="font-medium">
                      <button
                        onClick={() => setDetailId(row.id)}
                        className="cursor-pointer text-left text-primary hover:underline"
                      >
                        {row.name}
                      </button>
                    </TableCell>
                    <TableCell>{row.location || "-"}</TableCell>
                    <TableCell>{row.mobile || "-"}</TableCell>
                    <TableCell>{row.email || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="icon-sm" onClick={() => setEditId(row.id)}>
                        <Pencil />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {detailId && (
        <StoreDetailsPanel
          storeId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={() => setEditId(detailId)}
        />
      )}

      <StoreEditDrawer
        open={!!editId}
        storeId={editId}
        onClose={() => setEditId(null)}
        onSaved={loadStores}
      />
    </div>
  );
}
