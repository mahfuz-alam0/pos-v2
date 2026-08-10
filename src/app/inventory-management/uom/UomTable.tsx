"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { fetchUomList } from "@/services/uom/list";

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
import UomFormDrawer from "./UomFormDrawer";
import { useSettings } from "@/context/settings-context";

const PAGE_SIZE_OPTIONS = [30, 50, 100, 200];

export default function UomTable() {
  const { defaultPageSize } = useSettings();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const loadUoms = useCallback(async (targetPage = 1, size = pageSize) => {
    setLoading(true);
    try {
      const res = await fetchUomList({ page: targetPage, limit: size });
      setRows(res?.data?.data?.uoms ?? []);
      const pagination = res?.data?.data?.paginationData;
      setTotalPages(pagination?.totalPages ?? 1);
      setTotalEntries(pagination?.totalEntries ?? (res?.data?.data?.uoms ?? []).length);
      setPage(targetPage);
    } catch (err) {
      toast.error(err?.message || "Failed to load units of measurement");
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    loadUoms(1);
  }, [loadUoms]);

  const openAdd = () => {
    setEditingId(null);
    setDrawerOpen(true);
  };

  const openEdit = (id: string | number) => {
    setEditingId(id);
    setDrawerOpen(true);
  };

  const handleSaved = () => {
    setDrawerOpen(false);
    setEditingId(null);
    loadUoms(page);
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
              <BreadcrumbPage className="font-medium text-primary">Unit of Measurements</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button className="h-9! rounded! px-3.5! text-[14px]! font-medium!" onClick={openAdd}>
          Add Unit of Measurement
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && rows.length > 0} />
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Short Form</TableHead>
              <TableHead className="text-center">Application Type</TableHead>
              <TableHead className="text-center">Conversion Rate</TableHead>
              <TableHead className="sticky right-0 z-10 w-33 bg-muted text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.35)]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_td]:h-12">
            {loading &&
              rows.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="border-b-0">
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
                  No units of measurement found.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              rows.map((row: any, i) => (
                <TableRow key={row.id} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                  <TableCell className="font-medium">
                    {row.systemGeneratedIdentifier ? (
                      row.name
                    ) : (
                      <button
                        type="button"
                        onClick={() => openEdit(row.id)}
                        className="text-left hover:underline"
                      >
                        {row.name}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{row.shortForm}</TableCell>
                  <TableCell className="text-center text-primary">
                    {row.applicationType === "SELLABLE_STOCK" ? "Unit Product" : "Product Group"}
                  </TableCell>
                  <TableCell className="text-center">{row.conversionRate ?? "-"}</TableCell>
                  <TableCell className={`sticky right-0 z-10 w-33 text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.35)] ${i % 2 === 1 ? "bg-table-zebra" : "bg-background"}`}>
                    {!row.systemGeneratedIdentifier && (
                      <div className="flex justify-center">
                        <Button variant="outline" size="icon-sm" onClick={() => openEdit(row.id)}>
                          <Pencil />
                        </Button>
                      </div>
                    )}
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
        onPageChange={loadUoms}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={(s) => {
          setPageSize(s);
          loadUoms(1, s);
        }}
      />

      <UomFormDrawer
        open={drawerOpen}
        uomId={editingId}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
