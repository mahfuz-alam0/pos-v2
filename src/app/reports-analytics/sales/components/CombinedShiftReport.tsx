"use client";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { money } from "../salesByShared";
import type { CombinedShiftReportData } from "../types";

export default function CombinedShiftReport({ data }: { data?: CombinedShiftReportData }) {
  const rows = data
    ? [
        { key: "totalCashIn", label: "Total Cash In", amount: data.totalCashIn },
        { key: "totalCashOut", label: "Total Cash Out", amount: data.totalCashOut },
        { key: "totalVirtualIn", label: "Total Virtual In", amount: data.totalVirtualIn },
        { key: "totalVirtualOut", label: "Total Virtual Out", amount: data.totalVirtualOut },
        { key: "totalCashAdjusted", label: "Total Cash Adjusted", amount: data.totalCashAdjusted },
        { key: "totalVirtualAdjusted", label: "Total Virtual Adjusted", amount: data.totalVirtualAdjusted },
      ]
    : [];

  return (
    <div className="rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <h3 className="mb-4 text-base font-semibold">Combined Shift Report</h3>
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell className="py-6 text-center text-muted-foreground">No data</TableCell>
              </TableRow>
            )}
            {rows.map((row, i) => (
              <TableRow
                key={row.key}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : "bg-background"}`}
              >
                <TableCell className="w-2/5">{row.label}</TableCell>
                <TableCell className="text-right font-semibold">{money(row.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
