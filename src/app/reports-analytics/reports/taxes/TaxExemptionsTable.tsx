"use client";

import { format } from "date-fns";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import type { ReportPagination, TaxExemptionRow } from "./types";

function money(v: any) {
  const n = Number(v);
  return `$${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

function safeDate(value: string | undefined, pattern: string) {
  if (!value) return "-";
  try {
    return format(new Date(value), pattern);
  } catch {
    return "-";
  }
}

export default function TaxExemptionsTable({
  data,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
}: {
  data: TaxExemptionRow[];
  loading: boolean;
  pagination: ReportPagination;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  return (
    <Card className="h-full p-0 shadow-sm ring-0">
      <div className="flex items-center gap-3 px-6 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
        <div className="h-5 w-1 rounded-full bg-orange-500" />
        <h3 className="text-base font-semibold">Tax Exemptions</h3>
      </div>
      <div className="overflow-auto *:data-[slot=table-container]:overflow-visible" style={{ maxHeight: "calc(100vh - 420px)" }}>
        <TableLoadingOverlay show={loading} />
        <Table>
          <TableHeader>
            <TableRow className="border-b-0 bg-muted/60 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
              <TableHead>Date of Sale</TableHead>
              <TableHead>Time of Sale</TableHead>
              <TableHead>Customer Type</TableHead>
              <TableHead>Tax Type</TableHead>
              <TableHead>Exemption Reason</TableHead>
              <TableHead className="text-right">Amount Exempt</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && !loading && (
              <TableRow className="border-b-0">
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  No tax exemption data available. Please run the report to see results.
                </TableCell>
              </TableRow>
            )}
            {data.map((row, i) => (
              <TableRow key={row.id ?? i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-50 dark:bg-stone-900/40" : ""}`}>
                <TableCell>{safeDate(row.date, "yyyy-MM-dd")}</TableCell>
                <TableCell>{safeDate(row.date, "HH:mm:ss")}</TableCell>
                <TableCell>{row.customerTypeName || "-"}</TableCell>
                <TableCell>{row.taxType || "-"}</TableCell>
                <TableCell>{row.exemptionReason || "-"}</TableCell>
                <TableCell className="text-right">{money(row.taxAmountExempt)}</TableCell>
                <TableCell>{row.employeeName || "-"}</TableCell>
                <TableCell>{row.customerName || "-"}</TableCell>
                <TableCell>{row.productName || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="px-6 py-4">
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
    </Card>
  );
}
