"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

import { fetchUomList } from "@/services/uom/list";

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
import { TablePagination } from "@/components/ui/table-pagination";
import UomFormDrawer from "./UomFormDrawer";

const PAGE_SIZE = 30;

export default function UomTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  const loadUoms = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const res = await fetchUomList({ page: targetPage, limit: PAGE_SIZE });
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
  }, []);

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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Unit of Measurements</h1>
        <Button onClick={openAdd}>
          <Plus /> Add Unit of Measurement
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Short Form</TableHead>
              <TableHead className="text-center">Application Type</TableHead>
              <TableHead className="text-center">Conversion Rate</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
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
                <TableRow key={row.id} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
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
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {row.applicationType === "SELLABLE_STOCK" ? "Unit Product" : "Product Group"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{row.conversionRate ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    {!row.systemGeneratedIdentifier && (
                      <div className="flex justify-end">
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
        pageSize={PAGE_SIZE}
        loading={loading}
        onPageChange={loadUoms}
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
