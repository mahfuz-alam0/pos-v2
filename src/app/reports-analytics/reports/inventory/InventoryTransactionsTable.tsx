"use client";

import { format } from "date-fns";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import type { InventoryTransactionRow, InventoryPagination } from "./types";

export default function InventoryTransactionsTable({
  data,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
}: {
  data: InventoryTransactionRow[];
  loading: boolean;
  pagination: InventoryPagination;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const totalQuantity = data.reduce((sum, r) => sum + (Number(r.quanitiy) || 0), 0);
  const totalCost = data.reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && data.length > 0} />
        <div className="overflow-auto *:data-[slot=table-container]:overflow-visible" style={{ maxHeight: "calc(100vh - 420px)" }}>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead className="w-45">Date & Time</TableHead>
                <TableHead className="w-37.5">Package ID</TableHead>
                <TableHead className="w-50">Product Name</TableHead>
                <TableHead className="w-37.5">Category</TableHead>
                <TableHead className="w-25 text-right">Quantity</TableHead>
                <TableHead className="w-40">Transaction Type</TableHead>
                <TableHead className="w-37.5">Room</TableHead>
                <TableHead className="w-30 text-right">Unit Cost</TableHead>
                <TableHead className="w-30 text-right">Total Cost</TableHead>
              </TableRow>
              <TableRow className="border-b-0 bg-muted/40 font-semibold">
                <TableHead colSpan={4} className="text-center">
                  TOTALS ({pagination.totalEntries} records)
                </TableHead>
                <TableHead className="text-right">{totalQuantity}</TableHead>
                <TableHead colSpan={2} className="text-center">
                  -
                </TableHead>
                <TableHead colSpan={2} className="text-right">
                  ${totalCost.toFixed(2)}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && data.length === 0 &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`s-${i}`} className="border-b-0">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {!loading && data.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No inventory transactions found.
                  </TableCell>
                </TableRow>
              )}
              {data.map((row, i) => (
                <TableRow key={`${row._id || row.packageId}-${i}`} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                  <TableCell>{row.dateTime ? format(new Date(row.dateTime), "yyyy-MM-dd HH:mm:ss") : "-"}</TableCell>
                  <TableCell>{row.packageId || "-"}</TableCell>
                  <TableCell>{row.productName || "-"}</TableCell>
                  <TableCell>{row.categoryName || "-"}</TableCell>
                  <TableCell className="text-right">{row.quanitiy ?? 0}</TableCell>
                  <TableCell>{row.transcationType || "-"}</TableCell>
                  <TableCell>{row.roomName || "-"}</TableCell>
                  <TableCell className="text-right">${(row.unitCost || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${(row.totalCost || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <TablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalEntries={pagination.totalEntries}
        pageSize={pagination.pageSize}
        loading={loading}
        onPageChange={onPageChange}
        pageSizeOptions={[30, 50, 100, 200]}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
