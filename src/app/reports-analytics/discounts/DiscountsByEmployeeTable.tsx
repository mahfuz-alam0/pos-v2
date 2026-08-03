"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import type { EmployeeDiscountRow, DiscountsPagination } from "./types";

function fmt(v: number) {
  return `$${(Number(v) || 0).toFixed(2)}`;
}
function pct(v: number) {
  return `${(Number(v) || 0).toFixed(1)}%`;
}

type SortKey = keyof EmployeeDiscountRow;

function Bar({ value, max, children }: { value: number; max: number; children: React.ReactNode }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="relative flex h-full min-h-9 w-full items-center">
      <div className="absolute left-0 h-full bg-sky-100 transition-[width] dark:bg-sky-950/50" style={{ width: `${percentage}%` }} />
      <span className="relative z-10 w-full text-center font-medium">{children}</span>
    </div>
  );
}

export default function DiscountsByEmployeeTable({
  data,
  loading,
  pagination,
  onPageChange,
}: {
  data: EmployeeDiscountRow[];
  loading: boolean;
  pagination: DiscountsPagination;
  onPageChange: (page: number) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : Number(av) - Number(bv);
      return sortAsc ? cmp : -cmp;
    });
  }, [data, sortKey, sortAsc]);

  const maxItems = Math.max(...data.map((d) => d.noOfItemsDiscounted || 0), 1);
  const maxOrders = Math.max(...data.map((d) => d.noOfOrdersDiscounted || 0), 1);
  const maxAvgDiscount = Math.max(...data.map((d) => d.avgItemDiscount || 0), 1);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((s) => !s);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const SortHead = ({ label, sortField, className }: { label: string; sortField: SortKey; className?: string }) => (
    <TableHead className={className}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(sortField)}>
        {label}
        <ArrowUpDown className="size-3" />
      </button>
    </TableHead>
  );

  return (
    <Card className="h-full p-0 shadow-sm ring-0">
      <div className="flex items-center gap-3 px-6 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
        <div className="h-5 w-1 rounded-full bg-violet-500" />
        <h3 className="text-base font-semibold">Item Discounts by Employee</h3>
      </div>
      <div className="relative overflow-auto *:data-[slot=table-container]:overflow-visible" style={{ maxHeight: 340 }}>
        <TableLoadingOverlay show={loading} />
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <SortHead label="Employee" sortField="employeeName" />
              <SortHead label="# Items Discounted" sortField="noOfItemsDiscounted" className="text-center" />
              <SortHead label="# Orders Discounted" sortField="noOfOrdersDiscounted" className="text-center" />
              <SortHead label="Item Discount %" sortField="itemDiscountPercent" className="text-center" />
              <SortHead label="Avg Item Discount" sortField="avgItemDiscount" className="text-center" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && !loading && (
              <TableRow className="border-b-0">
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  No discount data for the selected period
                </TableCell>
              </TableRow>
            )}
            {sorted.map((row, i) => (
              <TableRow key={row.employeeName} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-50 dark:bg-stone-900/40" : ""}`}>
                <TableCell className="font-medium">{row.employeeName}</TableCell>
                <TableCell className="p-0">
                  <Bar value={row.noOfItemsDiscounted} max={maxItems}>{row.noOfItemsDiscounted}</Bar>
                </TableCell>
                <TableCell className="p-0">
                  <Bar value={row.noOfOrdersDiscounted} max={maxOrders}>{row.noOfOrdersDiscounted}</Bar>
                </TableCell>
                <TableCell className="p-0">
                  <Bar value={Math.min(row.itemDiscountPercent, 100)} max={100}>{pct(row.itemDiscountPercent)}</Bar>
                </TableCell>
                <TableCell className="p-0">
                  <Bar value={row.avgItemDiscount} max={maxAvgDiscount}>{fmt(row.avgItemDiscount)}</Bar>
                </TableCell>
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
