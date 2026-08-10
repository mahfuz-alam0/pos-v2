"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import type { HourOfDayRow, DayAndTimePagination } from "./types";

function fmt(v: number) {
  return `$${(Number(v) || 0).toFixed(2)}`;
}

type SortKey = keyof HourOfDayRow;

function Bar({ value, max, children }: { value: number; max: number; children: React.ReactNode }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="relative flex h-full min-h-9 w-full items-center">
      <div className="absolute right-0 h-full bg-sky-100 transition-[width] dark:bg-sky-950/50" style={{ width: `${percentage}%` }} />
      <span className="relative z-10 w-full pr-3 text-right font-medium">{children}</span>
    </div>
  );
}

export default function HourOfDayTable({
  data,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
}: {
  data: HourOfDayRow[];
  loading: boolean;
  pagination: DayAndTimePagination;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
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

  const maxRevenue = Math.max(...data.map((d) => d.revenue || 0), 1);
  const maxOrderCount = Math.max(...data.map((d) => d.orderCount || 0), 1);
  const maxAvgProfit = Math.max(...data.map((d) => d.avgProfit || 0), 1);
  const maxAvgSales = Math.max(...data.map((d) => d.avgSales || 0), 1);
  const maxAov = Math.max(...data.map((d) => d.aov || 0), 1);

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
        <div className="h-5 w-1 rounded-full bg-orange-500" />
        <h3 className="text-base font-semibold">Hour of Day</h3>
      </div>
      <div className="relative overflow-auto *:data-[slot=table-container]:overflow-visible" style={{ maxHeight: 340 }}>
        <TableLoadingOverlay show={loading} />
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <SortHead label="Hour" sortField="hour" />
              <SortHead label="Revenue" sortField="revenue" className="text-right" />
              <SortHead label="Order Count" sortField="orderCount" className="text-right" />
              <SortHead label="Avg Profit" sortField="avgProfit" className="text-right" />
              <SortHead label="Avg Sales" sortField="avgSales" className="text-right" />
              <SortHead label="AOV" sortField="aov" className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && !loading && (
              <TableRow className="border-b-0">
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  No data for the selected period
                </TableCell>
              </TableRow>
            )}
            {sorted.map((row, i) => (
              <TableRow key={row.hour} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-50 dark:bg-stone-900/40" : ""}`}>
                <TableCell className="font-medium">{row.hour}</TableCell>
                <TableCell className="p-0">
                  <Bar value={row.revenue} max={maxRevenue}>{fmt(row.revenue)}</Bar>
                </TableCell>
                <TableCell className="p-0">
                  <Bar value={row.orderCount} max={maxOrderCount}>{row.orderCount ?? 0}</Bar>
                </TableCell>
                <TableCell className="p-0">
                  <Bar value={row.avgProfit} max={maxAvgProfit}>{fmt(row.avgProfit)}</Bar>
                </TableCell>
                <TableCell className="p-0">
                  <Bar value={row.avgSales} max={maxAvgSales}>{fmt(row.avgSales)}</Bar>
                </TableCell>
                <TableCell className="p-0">
                  <Bar value={row.aov} max={maxAov}>{fmt(row.aov)}</Bar>
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
          pageSizeOptions={[30, 50, 100, 200]}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </Card>
  );
}
