"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money } from "../salesByShared";
import type { SaleTransaction } from "../types";

export default function TotalSalesBreakdown({ data }: { data?: SaleTransaction[] }) {
  const rows = data || [];
  return (
    <div className="rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <h3 className="mb-4 text-base font-semibold">Total Sales Breakdown</h3>
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Total Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                  No data
                </TableCell>
              </TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow
                key={`${r.paymentMethod}-${i}`}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : "bg-background"}`}
              >
                <TableCell>{r.displayName || r.paymentMethod}</TableCell>
                <TableCell className="text-right">{money(r.totalSubtotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
