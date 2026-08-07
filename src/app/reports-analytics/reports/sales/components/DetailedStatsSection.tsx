"use client";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { money } from "../salesByShared";
import type { DetailedStats, SalesOverviewData } from "../types";

function buildRows(stats?: DetailedStats) {
  const s = stats || {};
  return [
    { key: "grossSales", label: "Gross Sales", stats: s.grossSales },
    { key: "discounts", label: "Discounts", stats: s.discounts },
    { key: "netSales", label: "Net Sales", stats: s.netSales },
    { key: "grossProfit", label: "Gross Profit", stats: s.grossProfit },
    { key: "costOfGoods", label: "Cost of Goods", stats: s.costOfGoods },
    { key: "totalSubtotal", label: "Total Subtotal", total: s.totalSubtotal },
    { key: "totalPaymentProcessingFee", label: "Payment Processing Fee", total: s.totalPaymentProcessingFee },
    { key: "totalTipGiven", label: "Total Tip Given", total: s.totalTipGiven },
    { key: "totalNumberOfSales", label: "Number of Sales", total: s.totalNumberOfSales, isCount: true },
    { key: "totalNumberOfSaleReturns", label: "Number of Returns", total: s.totalNumberOfSaleReturns, isCount: true },
    { key: "totalItemsSold", label: "Items Sold", total: s.totalItemsSold, isCount: true },
    { key: "totalFinalPayable", label: "Total Final Payable", total: s.totalFinalPayable },
    { key: "totalPaymentProcessingDiscount", label: "Payment Processing Discount", total: s.totalPaymentProcessingDiscount },
  ];
}

function DetailedStatsTable({ title, stats }: { title: string; stats?: DetailedStats }) {
  const rows = buildRows(stats);
  return (
    <div className="rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                key={row.key}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : "bg-background"}`}
              >
                <TableCell className="w-2/5">{row.label}</TableCell>
                {row.stats ? (
                  <>
                    <TableCell className="text-right">{row.stats.marijuana ? money(row.stats.marijuana) : "-"}</TableCell>
                    <TableCell className="text-right">{row.stats.nonMarijuana ? money(row.stats.nonMarijuana) : "-"}</TableCell>
                    <TableCell className="text-right">{row.stats.other ? money(row.stats.other) : "-"}</TableCell>
                    <TableCell className="text-right font-semibold">{money(row.stats.total)}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right font-semibold">{row.isCount ? (row.total ?? 0) : money(row.total)}</TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function DetailedStatsSection({ salesOverviewData }: { salesOverviewData?: SalesOverviewData }) {
  return <DetailedStatsTable title="Tax Exempted Sales Report" stats={salesOverviewData?.taxExemptedStats} />;
}
