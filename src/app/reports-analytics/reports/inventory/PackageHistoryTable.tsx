"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import type { PackageHistoryRow, InventoryPagination } from "./types";

export default function PackageHistoryTable({
  data,
  loading,
  pagination,
  onPageChange,
}: {
  data: PackageHistoryRow[];
  loading: boolean;
  pagination: InventoryPagination;
  onPageChange: (page: number) => void;
}) {
  const totalQuantityChange = data.reduce((sum, r) => sum + (Number(r.packageQuantityChange) || 0), 0);
  const totalPackageTotal = data.reduce((sum, r) => sum + (Number(r.packageTotal) || 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && data.length > 0} />
        <div className="overflow-auto *:data-[slot=table-container]:overflow-visible" style={{ maxHeight: "calc(100vh - 420px)" }}>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead className="w-50">Product</TableHead>
                <TableHead className="w-37.5">SKU</TableHead>
                <TableHead className="w-37.5">Location</TableHead>
                <TableHead className="w-40">Transaction ID</TableHead>
                <TableHead className="w-40">Transaction Type</TableHead>
                <TableHead className="w-37.5 text-right">Quantity Change</TableHead>
                <TableHead className="w-37.5 text-right">Package Total</TableHead>
                <TableHead className="w-37.5">Room</TableHead>
              </TableRow>
              <TableRow className="border-b-0 bg-muted/40 font-semibold">
                <TableHead colSpan={5} className="text-center">
                  TOTALS ({pagination.totalEntries} records)
                </TableHead>
                <TableHead className="text-right">
                  {totalQuantityChange > 0 ? `+${totalQuantityChange.toFixed(2)}` : totalQuantityChange.toFixed(2)}
                </TableHead>
                <TableHead className="text-right">{totalPackageTotal.toFixed(2)}</TableHead>
                <TableHead className="text-center">-</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && data.length === 0 &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`s-${i}`} className="border-b-0">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {!loading && data.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No package history found.
                  </TableCell>
                </TableRow>
              )}
              {data.map((row, i) => (
                <TableRow key={`${row._id || row.transactionId}-${i}`} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                  <TableCell>{row.productName || "-"}</TableCell>
                  <TableCell>{row.productSku || "-"}</TableCell>
                  <TableCell>{row.location?.country || "-"}</TableCell>
                  <TableCell>{row.transactionId || "-"}</TableCell>
                  <TableCell>{row.transactionType || "-"}</TableCell>
                  <TableCell className="text-right">
                    {row.packageQuantityChange > 0 ? `+${row.packageQuantityChange}` : row.packageQuantityChange}
                  </TableCell>
                  <TableCell className="text-right">{row.packageTotal}</TableCell>
                  <TableCell>{row.roomName || "-"}</TableCell>
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
      />
    </div>
  );
}
