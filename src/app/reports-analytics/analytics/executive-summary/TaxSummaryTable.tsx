"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OverallTaxStats, TaxProfileStat } from "./types";

export default function TaxSummaryTable({
  statsByTaxProfile,
  overallStats,
}: {
  statsByTaxProfile: TaxProfileStat[];
  overallStats: OverallTaxStats;
}) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <Table>
        <TableHeader className="[&_tr]:border-b-0">
          <TableRow className="bg-muted/60">
            <TableHead>Tax Type</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right">Times Applied</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Total Taxes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statsByTaxProfile.length === 0 && (
            <TableRow className="border-b-0">
              <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                No tax data available.
              </TableCell>
            </TableRow>
          )}
          {statsByTaxProfile.map((row, i) => (
            <TableRow
              key={row.profileId}
              className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
            >
              <TableCell>{row.name || row.profileName}</TableCell>
              <TableCell className="text-right">{row.percentageUsed ?? "N/A"}</TableCell>
              <TableCell className="text-right">{row.totalTimesApplied}</TableCell>
              <TableCell className="text-right">${Number(row.totalRevenueInvolved || 0).toFixed(2)}</TableCell>
              <TableCell className="text-right font-semibold">${Number(row.totalAmount || 0).toFixed(2)}</TableCell>
            </TableRow>
          ))}
          {statsByTaxProfile.length > 0 && (
            <TableRow className="border-b-0 bg-muted/40 font-semibold">
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right">${Number(overallStats.totalRevenueInvolved || 0).toFixed(2)}</TableCell>
              <TableCell className="text-right">${Number(overallStats.totalAmount || 0).toFixed(2)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
