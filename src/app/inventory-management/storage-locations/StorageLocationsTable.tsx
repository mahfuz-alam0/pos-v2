"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchStorageLocations } from "@/services/storageLocations/list";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
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
import { useSettings } from "@/context/settings-context";

const PAGE_SIZE_OPTIONS = [30, 50, 100, 200];

interface StorageLocationRow {
  id: string | number;
  name: string;
  openForAcceptingTransfers: boolean;
  isSellableOnPhysicalStore: boolean;
  shopId: string | number;
}

export default function StorageLocationsTable() {
  const { defaultPageSize } = useSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shopId } = useShop();

  const openId = searchParams.get("id");

  const [rows, setRows] = useState<StorageLocationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; locationId: string | number | null }>({
    open: false,
    mode: "add",
    locationId: null,
  });

  const loadLocations = useCallback(
    async (targetPage = 1, size = pageSize) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const res = await fetchStorageLocations(shopId, { page: targetPage, limit: size });
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
        const pagination = res?.data?.data?.paginationData;
        setTotalPages(pagination?.totalPages ?? 1);
        setTotalEntries(pagination?.totalEntries ?? locations.length);
        setPage(targetPage);
      } catch (err: unknown) {
        toast.error((err as Error)?.message || "Failed to load storage locations");
      } finally {
        setLoading(false);
      }
    },
    [shopId, pageSize]
  );

  useEffect(() => {
    loadLocations(1);
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
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/inventory-management">Inventory Management</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-primary">Storage Location</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button
          className="h-9! rounded! px-3.5! text-[14px]! font-medium!"
          onClick={() => setDrawer({ open: true, mode: "add", locationId: null })}
        >
          Add Storage Location
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && rows.length > 0} />
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Location Name</TableHead>
              <TableHead>Default Package Destination</TableHead>
              <TableHead>Open For Sellable In Physical Store</TableHead>
              <TableHead className="sticky right-0 z-10 w-33 bg-muted text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.35)]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-muted-foreground [&_td]:h-12">
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`} className="border-b-0">
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
                    <TableCell>{row.openForAcceptingTransfers ? "yes" : "no"}</TableCell>
                    <TableCell>{row.isSellableOnPhysicalStore ? "yes" : "no"}</TableCell>
                    <TableCell className={`sticky right-0 z-10 w-33 text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.35)] ${i % 2 === 1 ? "bg-table-zebra" : "bg-background"}`}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-primary hover:text-primary"
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

        <TablePagination
          page={page}
          totalPages={totalPages}
          totalEntries={totalEntries}
          pageSize={pageSize}
          loading={loading}
          onPageChange={loadLocations}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={(s) => {
            setPageSize(s);
            loadLocations(1, s);
          }}
        />

      <StorageLocationDetails locationId={openId} onClose={closeDetail} />

      <StorageLocationDrawer
        open={drawer.open}
        mode={drawer.mode}
        locationId={drawer.locationId}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={() => loadLocations(page)}
      />
    </div>
  );
}
