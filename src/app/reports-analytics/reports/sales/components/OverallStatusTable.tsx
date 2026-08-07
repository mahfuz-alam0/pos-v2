"use client";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import TaxBreakdownCard from "../../../analytics/executive-summary/TaxBreakdownCard";
import { money } from "../salesByShared";
import type { SalesOverviewData, StatBlock } from "../types";

interface Row {
  key: string;
  label: string;
  tooltip?: string;
  stats?: StatBlock;
  total?: number;
  isCount?: boolean;
  isPercent?: boolean;
}

function buildRows(data?: SalesOverviewData): Row[] {
  const s = data?.overallStats || {};
  return [
    { key: "grossSales", label: "Gross Sales", tooltip: "Total value of all items sold before any discounts or taxes", stats: s.grossSales },
    { key: "discounts", label: "Discounts Given", tooltip: "Total amount discounted from sales (BOGO, promos, coupons, etc.)", stats: s.discounts },
    { key: "netSales", label: "Net Sales", tooltip: "Sales after discounts (Pre-Tax)", stats: s.netSales },
    { key: "grossProfit", label: "Gross Profit", tooltip: "Gross profit before expenses", stats: s.grossProfit },
    { key: "costOfGoods", label: "Cost of Goods", tooltip: "Product cost", stats: s.costOfGoods },
    { key: "totalWithoutTax", label: "Total (Tax Excluded)", stats: s.totalWithoutTax },
    { key: "totalFinalPayable", label: "Total (Taxes Included)", stats: s.totalFinalPayable },
    { key: "totalPaymentProcessingDiscount", label: "Total Payment Processing Discount", tooltip: "Discounts applied through payment processing (if any)", total: s.totalPaymentProcessingDiscount },
    { key: "totalPaymentProcessingFee", label: "Total Processing Fees", total: s.totalPaymentProcessingFee },
    { key: "totalTipGiven", label: "Total Tips Given", total: s.totalTipGiven },
    { key: "totalNumberOfSales", label: "Total Number of Sales", total: s.totalNumberOfSales, isCount: true },
    { key: "totalNumberOfSaleReturns", label: "Total Number of Returns", total: s.totalNumberOfSaleReturns, isCount: true },
    { key: "totalItemsSold", label: "Total Number of Items Sold", total: s.totalItemsSold, isCount: true },
    { key: "totalCustomers", label: "Total Customers", total: data?.totalCustomers, isCount: true },
    { key: "newCustomers", label: "New Customers", total: data?.newCustomers, isCount: true },
    { key: "percentageNewCustomers", label: "Percentage of New Customers", total: data?.percentageNewCustomers, isPercent: true },
    { key: "avgNewCustomerSales", label: "Average New Customer Sales", total: data?.avgNewCustomerSales },
  ];
}

function StatCell({ value }: { value?: number }) {
  return <TableCell className="text-right">{value ? money(value) : "-"}</TableCell>;
}

export default function OverallStatusTable({ salesOverviewData }: { salesOverviewData?: SalesOverviewData }) {
  const rows = buildRows(salesOverviewData);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
        <h3 className="mb-4 text-base font-semibold">Sales Overview</h3>
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow
                  key={row.key}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : "bg-background"}`}
                >
                  <TableCell className="w-2/5">
                    <span className="flex items-center gap-1.5">
                      {row.label}
                      {row.tooltip && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="size-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>{row.tooltip}</TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                  </TableCell>
                  {row.stats ? (
                    <>
                      <StatCell value={row.stats.marijuana} />
                      <StatCell value={row.stats.nonMarijuana} />
                      <StatCell value={row.stats.other} />
                      <TableCell className="text-right font-semibold">{money(row.stats.total)}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right font-semibold">
                        {row.isCount ? (row.total ?? 0) : row.isPercent ? `${(row.total ?? 0).toFixed(2)}%` : money(row.total)}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
        <h3 className="mb-4 text-base font-semibold">Tax Breakdown</h3>
        <TaxBreakdownCard taxesByClassification={salesOverviewData?.taxesByClassification || []} />
      </div>
    </div>
  );
}
