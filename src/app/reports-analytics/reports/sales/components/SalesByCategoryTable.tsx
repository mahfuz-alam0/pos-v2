"use client";

import { Fragment } from "react";
import { money } from "../salesByShared";
import type { CategoryWiseBreakdownRow } from "../types";

const GROUPS = ["Gross Sales", "Discounts", "Net Sales", "Gross Profit", "Cost of Goods"] as const;
const SUB_LABELS = ["Marijuana", "Non-Marijuana", "Other"] as const;
const GROUP_KEYS: Record<(typeof GROUPS)[number], "grossSales" | "discounts" | "netSales" | "grossProfit" | "costOfGoods"> = {
  "Gross Sales": "grossSales",
  Discounts: "discounts",
  "Net Sales": "netSales",
  "Gross Profit": "grossProfit",
  "Cost of Goods": "costOfGoods",
};

function sumField(rows: CategoryWiseBreakdownRow[], group: (typeof GROUPS)[number], sub: "marijuana" | "nonMarijuana" | "other") {
  const key = GROUP_KEYS[group];
  return rows.reduce((s, r) => s + (r[key]?.[sub] || 0), 0);
}

export default function SalesByCategoryTable({ categoryData }: { categoryData: CategoryWiseBreakdownRow[] }) {
  const rows = categoryData || [];

  return (
    <div className="rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <h3 className="mb-4 text-base font-semibold">Sales By Category</h3>
      <div className="overflow-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th rowSpan={2} className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left font-semibold shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.15)]">
                Category
              </th>
              <th rowSpan={2} className="px-3 py-2 text-right font-semibold shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                Items Sold
              </th>
              {GROUPS.map((g) => (
                <th key={g} colSpan={3} className="bg-muted/60 px-3 py-2 text-center font-semibold shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                  {g}
                </th>
              ))}
            </tr>
            <tr className="bg-muted/30">
              {GROUPS.map((g) =>
                SUB_LABELS.map((sub) => (
                  <th key={`${g}-${sub}`} className="px-3 py-1.5 text-right text-xs font-medium shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                    {sub}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={2 + GROUPS.length * 3} className="py-6 text-center text-muted-foreground">
                  No data
                </td>
              </tr>
            )}
            {rows.map((item, i) => {
              const zebra = i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : "bg-background";
              return (
                <tr key={item.categoryId || i} className={zebra}>
                  <td className={`sticky left-0 z-10 px-3 py-2 shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.15)] ${zebra}`}>{item.categoryName || ""}</td>
                  <td className="px-3 py-2 text-right shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">{item.totalItemsSold || 0}</td>
                  {GROUPS.map((g) => {
                    const key = GROUP_KEYS[g];
                    const stat = item[key];
                    return (
                      <Fragment key={g}>
                        <td className="px-3 py-2 text-right shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">{money(stat?.marijuana)}</td>
                        <td className="px-3 py-2 text-right shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">{money(stat?.nonMarijuana)}</td>
                        <td className="px-3 py-2 text-right shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">{money(stat?.other)}</td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-muted/60 font-semibold">
                <td className="sticky left-0 z-10 bg-muted/60 px-3 py-2">TOTAL</td>
                <td className="px-3 py-2 text-right">{rows.reduce((s, r) => s + (r.totalItemsSold || 0), 0)}</td>
                {GROUPS.map((g) => (
                  <Fragment key={g}>
                    <td className="px-3 py-2 text-right">{money(sumField(rows, g, "marijuana"))}</td>
                    <td className="px-3 py-2 text-right">{money(sumField(rows, g, "nonMarijuana"))}</td>
                    <td className="px-3 py-2 text-right">{money(sumField(rows, g, "other"))}</td>
                  </Fragment>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
