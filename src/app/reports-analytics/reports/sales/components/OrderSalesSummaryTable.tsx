"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OrderSalesSummaryData } from "../types";

function formatMoney(value?: number) {
  if (value === null || value === undefined) return "-";
  const abs = Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `(${abs})` : abs;
}

const ROWS: { key: keyof OrderSalesSummaryData; label: string; isCount?: boolean; isTotal?: boolean }[] = [
  { key: "numberOfOrders", label: "# of Orders", isCount: true },
  { key: "cogs", label: "COGS" },
  { key: "lineItemDiscounts", label: "Line Item Discounts" },
  { key: "subtotal", label: "Subtotal" },
  { key: "storeCredits", label: "Credits" },
  { key: "adjustments", label: "Adjustments" },
  { key: "loyalty", label: "Loyalty" },
  { key: "taxes", label: "Taxes" },
  { key: "grandTotal", label: "Grand Total", isTotal: true },
  { key: "totalWithoutTaxes", label: "Total w/o Taxes", isTotal: true },
];

export default function OrderSalesSummaryTable({ data }: { data?: OrderSalesSummaryData | null }) {
  if (!data) return null;

  return (
    <div className="rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <h3 className="mb-4 text-base font-semibold">Order / Sales Summary</h3>
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
              <TableHead className="w-2/5" />
              <TableHead colSpan={2} className="bg-[#038FDE] text-center text-white">
                Total
              </TableHead>
              <TableHead colSpan={2} className="bg-[#038FDE] text-center text-white">
                Average
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row, i) => {
              const metric = data[row.key] as any;
              const totalVal = row.isCount ? (metric ?? null) : (metric?.total ?? null);
              const avgVal = row.isCount ? null : (metric?.average ?? null);
              return (
                <TableRow
                  key={row.key}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : "bg-background"}`}
                >
                  <TableCell className={row.isTotal ? "text-right font-bold" : "text-right"}>{row.label}</TableCell>
                  <TableCell className="w-5 pr-1 text-right">{!row.isCount ? "$" : ""}</TableCell>
                  <TableCell className={`text-right ${row.isTotal ? "font-bold" : ""}`}>
                    {row.isCount ? (totalVal ?? "-") : formatMoney(totalVal)}
                  </TableCell>
                  <TableCell className="w-5 pr-1 text-right">{!row.isCount ? "$" : ""}</TableCell>
                  <TableCell className={`text-right ${row.isTotal ? "font-bold" : ""}`}>{row.isCount ? "" : formatMoney(avgVal)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
