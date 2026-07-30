"use client";

import { useMemo } from "react";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import type { ReportPagination, TaxDetailRow } from "./types";

function money(v: any) {
  const n = Number(v);
  return `$${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}
function pct(v: any) {
  const n = Number(v);
  return `${Number.isFinite(n) ? n.toFixed(2) : "0.00"}%`;
}

export default function TaxDetailsTable({
  data,
  loading,
  pagination,
  onPageChange,
}: {
  data: TaxDetailRow[];
  loading: boolean;
  pagination: ReportPagination;
  onPageChange: (page: number) => void;
}) {
  const taxNames = useMemo(() => {
    const names = new Set<string>();
    data.forEach((row) => row.taxes?.forEach((t) => t.name && names.add(t.name)));
    return Array.from(names).sort();
  }, [data]);

  const taxAmount = (row: TaxDetailRow, name: string) => row.taxes?.find((t) => t.name === name)?.amount || 0;
  const taxRate = (row: TaxDetailRow, name: string) => row.taxes?.find((t) => t.name === name)?.rate ?? null;

  return (
    <Card className="h-full p-0 shadow-sm ring-0">
      <div className="flex items-center gap-3 px-6 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
        <div className="h-5 w-1 rounded-full bg-orange-500" />
        <h3 className="text-base font-semibold">Tax Details</h3>
      </div>
      <div className="overflow-auto *:data-[slot=table-container]:overflow-visible" style={{ maxHeight: "calc(100vh - 420px)" }}>
        <TableLoadingOverlay show={loading} />
        <Table>
          <TableHeader>
            <TableRow className="border-b-0 bg-muted/60 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Package ID</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Supplier License</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Qty Sold</TableHead>
              <TableHead className="text-right">Total Price</TableHead>
              {taxNames.map((name) => (
                <TableHead key={`tax_${name}`} className="text-right">
                  {name} Amount
                </TableHead>
              ))}
              {taxNames.map((name) => (
                <TableHead key={`rate_${name}`} className="text-right">
                  {name} Rate
                </TableHead>
              ))}
              <TableHead className="text-right">Total Tax</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && !loading && (
              <TableRow className="border-b-0">
                <TableCell colSpan={11 + taxNames.length * 2 + 1} className="py-8 text-center text-muted-foreground">
                  No tax data available. Please run the report to see results.
                </TableCell>
              </TableRow>
            )}
            {data.map((row, i) => (
              <TableRow
                key={`${row.productId}-${row.createdAt}-${i}`}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-50 dark:bg-stone-900/40" : ""}`}
              >
                <TableCell className="font-medium">{row.productName || "-"}</TableCell>
                <TableCell>{row.categoryName || "-"}</TableCell>
                <TableCell>{row.sku || "-"}</TableCell>
                <TableCell>{row.purchaseUoMShortForm || "-"}</TableCell>
                <TableCell>{row.advertisedSaleId || "-"}</TableCell>
                <TableCell>{row.brandName || "-"}</TableCell>
                <TableCell>{row.supplierName || "-"}</TableCell>
                <TableCell>{row.supplierLicense || "-"}</TableCell>
                <TableCell className="text-right">{money(row.unitPrice)}</TableCell>
                <TableCell className="text-right">{row.quantitySold ?? 0}</TableCell>
                <TableCell className="text-right">{money(row.totalPrice)}</TableCell>
                {taxNames.map((name) => (
                  <TableCell key={`tax_${name}`} className="text-right">
                    {money(taxAmount(row, name))}
                  </TableCell>
                ))}
                {taxNames.map((name) => {
                  const rate = taxRate(row, name);
                  return (
                    <TableCell key={`rate_${name}`} className="text-right">
                      {rate == null ? "N/A" : pct(rate)}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right font-medium">{money(row.totalTaxApplied)}</TableCell>
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
        />
      </div>
    </Card>
  );
}
