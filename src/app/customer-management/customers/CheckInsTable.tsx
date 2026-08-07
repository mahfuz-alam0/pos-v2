"use client";

import { useCallback, useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

import { getQueuedCustomers } from "@/services/customers/getQueuedCustomers";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 20;

const ORDER_FILTER_ITEMS = [
  { value: "all", label: "All Check-ins" },
  { value: "true", label: "Order Placed" },
  { value: "false", label: "No Order Placed" },
];

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
}

function formatDuration(seconds?: number) {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = parseFloat((seconds % 60).toFixed(1));
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

interface CheckInsTableProps {
  onRowClick: (record: any) => void;
}

export default function CheckInsTable({ onRowClick }: CheckInsTableProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [orderFilter, setOrderFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const fetchData = useCallback(
    async (p: number, filter: string, range?: DateRange) => {
      setLoading(true);
      try {
        const isOrderPlaced = filter === "all" ? null : filter === "true";
        const res = await getQueuedCustomers({
          page: p,
          limit: PAGE_SIZE,
          isOrderPlaced,
          startDate: range?.from ? range.from.toISOString().slice(0, 10) : undefined,
          endDate: range?.to ? range.to.toISOString().slice(0, 10) : undefined,
        });
        const items = res?.data?.data ?? [];
        const totalCount = res?.data?.paginationData?.totalEntries ?? (Array.isArray(items) ? items.length : 0);
        setRecords(Array.isArray(items) ? items : []);
        setTotal(totalCount);
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData(1, orderFilter, dateRange);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          items={ORDER_FILTER_ITEMS}
          value={orderFilter}
          onValueChange={setOrderFilter}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_FILTER_ITEMS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && records.length > 0} />
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Customer</TableHead>
              <TableHead>Check-in Date &amp; Time</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Time in Queue</TableHead>
              <TableHead>Order Placed</TableHead>
              <TableHead>Checked In By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              records.length === 0 &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow
                  key={`skeleton-${i}`}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                >
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && records.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No check-in records found.
                </TableCell>
              </TableRow>
            )}

            {records.map((record, i) => {
              const name = `${record.firstName || ""} ${record.lastName || ""}`.trim() || "—";
              return (
                <TableRow
                  key={record._id ?? record.id ?? i}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                >
                  <TableCell className="font-medium">
                    <button onClick={() => onRowClick(record)} className="cursor-pointer text-left text-primary hover:underline">
                      {name}
                    </button>
                  </TableCell>
                  <TableCell>{formatDateTime(record.enqueued)}</TableCell>
                  <TableCell>{formatDateTime(record.dequeued)}</TableCell>
                  <TableCell>{formatDuration(record.queuedInSeconds)}</TableCell>
                  <TableCell>
                    {record.isOrderPlaced === null || record.isOrderPlaced === undefined
                      ? "N/A"
                      : record.isOrderPlaced
                        ? "Yes"
                        : "No"}
                  </TableCell>
                  <TableCell>{record.employeeName || "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalEntries={total}
          pageSize={PAGE_SIZE}
          loading={loading}
          onPageChange={(p) => {
            setPage(p);
            fetchData(p, orderFilter, dateRange);
          }}
        />
      )}
    </div>
  );
}
