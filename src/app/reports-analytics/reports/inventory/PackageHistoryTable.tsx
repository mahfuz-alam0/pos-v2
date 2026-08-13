"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import type { PackageHistoryRow, InventoryPagination } from "./types";

// Matches the date formatting convention used on the order details page
// (SalesTable.tsx's fmtDateTime).
const fmtDate = (d?: string) => {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function PackageHistoryTable({
  data,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
}: {
  data: PackageHistoryRow[];
  loading: boolean;
  pagination: InventoryPagination;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const totalPackageTotal = data.reduce((sum, r) => sum + (Number(r.packageTotal) || 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && data.length > 0} />
        <div className="overflow-auto *:data-[slot=table-container]:overflow-visible" style={{ maxHeight: "calc(100vh - 420px)" }}>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead className="w-40">Date</TableHead>
                <TableHead className="w-30 text-right">Total</TableHead>
                <TableHead className="w-40">Storage Location</TableHead>
                <TableHead className="w-40">Order ID</TableHead>
              </TableRow>
              <TableRow className="border-b-0 bg-muted/40 font-semibold">
                <TableHead colSpan={1} className="text-center">
                  TOTALS ({pagination.totalEntries} records)
                </TableHead>
                <TableHead className="text-right">{totalPackageTotal.toFixed(2)}</TableHead>
                <TableHead colSpan={2}>-</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && data.length === 0 &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`s-${i}`} className="border-b-0">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {!loading && data.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No package history found.
                  </TableCell>
                </TableRow>
              )}
              {data.map((row, i) => (
                <TableRow key={`${row._id || row.transactionId}-${i}`} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                  <TableCell>{fmtDate(row.createdAt)}</TableCell>
                  <TableCell className="text-right">{row.packageTotal}</TableCell>
                  <TableCell>{row.roomName || "-"}</TableCell>
                  <TableCell className="font-medium text-primary">{row.transactionId || "-"}</TableCell>
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
