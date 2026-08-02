"use client";

import { useMemo } from "react";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TaxDetailRow, TaxDetailSummary } from "./types";

function money(v: any) {
  const n = Number(v);
  return `$${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

export default function TaxBreakdownSummary({
  data,
  summary,
}: {
  data: TaxDetailRow[];
  summary: TaxDetailSummary | null;
}) {
  const { statRows, taxRows } = useMemo(() => {
    const totals = summary
      ? {
          totalSales: summary.totalSales || 0,
          totalTaxAmount: summary.totalTax || 0,
          totalQuantity: summary.totalQuantitySold || 0,
          transactionCount: summary.totalTransactions || 0,
        }
      : data.reduce(
          (acc, row) => {
            acc.totalSales += row.totalPrice || 0;
            acc.totalTaxAmount += row.totalTaxApplied || 0;
            acc.totalQuantity += row.quantitySold || 0;
            return acc;
          },
          { totalSales: 0, totalTaxAmount: 0, totalQuantity: 0, transactionCount: data.length },
        );

    const taxMap: Record<string, { name: string; rate: number | null; amount: number }> = {};
    data.forEach((row) => {
      row.taxes?.forEach((tax) => {
        const key = `${tax.name}-${tax.rate}`;
        if (!taxMap[key]) taxMap[key] = { name: tax.name || "N/A", rate: tax.rate ?? null, amount: 0 };
        taxMap[key].amount += tax.amount || 0;
      });
    });

    return {
      statRows: [
        { label: "Total Sales", value: money(totals.totalSales) },
        { label: "Total Qty Sold", value: totals.totalQuantity.toLocaleString() },
        { label: "Total Transactions", value: totals.transactionCount.toLocaleString() },
        { label: "Total Tax Collected", value: money(totals.totalTaxAmount) },
      ],
      taxRows: Object.values(taxMap).map((t) => ({
        name: t.name,
        rate: typeof t.rate === "number" ? `${t.rate.toFixed(2)}%` : "N/A",
        amount: money(t.amount),
      })),
    };
  }, [data, summary]);

  return (
    <Card className="h-full p-0 shadow-sm ring-0">
      <div className="flex items-center gap-3 px-6 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
        <div className="h-5 w-1 rounded-full bg-orange-500" />
        <h3 className="text-base font-semibold">Tax Breakdown</h3>
      </div>

      <div className="grid grid-cols-1 gap-px px-6 py-4 sm:grid-cols-2">
        {statRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-semibold">{row.value}</span>
          </div>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-b-0 bg-muted/60 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
            <TableHead>Tax Name</TableHead>
            <TableHead className="text-center">Rate</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {taxRows.length === 0 && (
            <TableRow className="border-b-0">
              <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                No tax data available
              </TableCell>
            </TableRow>
          )}
          {taxRows.map((t, i) => (
            <TableRow key={`${t.name}-${i}`} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-50 dark:bg-stone-900/40" : ""}`}>
              <TableCell>{t.name}</TableCell>
              <TableCell className="text-center">{t.rate}</TableCell>
              <TableCell className="text-right font-semibold">{t.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
