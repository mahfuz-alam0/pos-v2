"use client";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { money, pct } from "../salesByShared";
import type { CustomerGroupSalesData } from "../types";

function buildRows(group: CustomerGroupSalesData) {
  const s = group.overallStats || {};
  return [
    { key: "grossSales", label: "Gross Sales", stats: s.grossSales },
    { key: "discounts", label: "Discounts Given", stats: s.discounts },
    { key: "netSales", label: "Net Sales", stats: s.netSales },
    { key: "grossProfit", label: "Gross Profit", stats: s.grossProfit },
    { key: "costOfGoods", label: "Cost of Goods", stats: s.costOfGoods },
    { key: "totalWithoutTax", label: "Total (Tax Excluded)", stats: s.totalWithoutTax },
    { key: "totalFinalPayable", label: "Total (Taxes Included)", stats: s.totalFinalPayable },
    { key: "totalPaymentProcessingDiscount", label: "Total Payment Processing Discount", total: s.totalPaymentProcessingDiscount },
    { key: "totalPaymentProcessingFee", label: "Total Processing Fees", total: s.totalPaymentProcessingFee },
    { key: "totalTipGiven", label: "Total Tips Given", total: s.totalTipGiven },
    { key: "totalNumberOfSales", label: "Total Number of Sales", total: s.totalNumberOfSales, isCount: true },
    { key: "totalNumberOfSaleReturns", label: "Total Number of Returns", total: s.totalNumberOfSaleReturns, isCount: true },
    { key: "totalItemsSold", label: "Total Number of Items Sold", total: s.totalItemsSold, isCount: true },
    { key: "totalCustomers", label: "Total Customers", total: group.totalCustomers, isCount: true },
    { key: "newCustomers", label: "New Customers", total: group.newCustomers, isCount: true },
    { key: "percentageNewCustomers", label: "Percentage of New Customers", total: group.percentageNewCustomers, isPercent: true },
    { key: "averageNewCustomerSales", label: "Average New Customer Sales", total: group.averageNewCustomerSales },
  ];
}

function CustomerGroupCard({ group }: { group: CustomerGroupSalesData }) {
  const rows = buildRows(group);
  return (
    <div className="rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <h3 className="mb-4 text-base font-semibold">{group.customerGroupName}</h3>
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
                    <TableCell className="text-right font-semibold">
                      {row.isCount ? (row.total ?? 0) : row.isPercent ? pct(row.total) : money(row.total)}
                    </TableCell>
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

export default function CustomerGroupSalesTable({ groups, loading }: { groups: CustomerGroupSalesData[]; loading: boolean }) {
  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading customer group sales…</div>;
  }
  if (!groups || groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold">Sales by Customer Group</h2>
        <p className="text-sm text-muted-foreground">Breakdown of sales metrics for each customer group</p>
      </div>
      {groups.map((group) => (
        <CustomerGroupCard key={group.customerGroupId} group={group} />
      ))}
    </div>
  );
}
