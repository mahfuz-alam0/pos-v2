"use client";

import { useCallback, useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

import { useShop } from "@/context/shop-context";
import { fetchAchTransactions } from "@/services/aeropay/listTransactions";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

const STATUS_OPTIONS = [
  { value: "__all__", label: "Select Status" },
  { value: "transaction_completed", label: "Completed" },
  { value: "transaction_failed", label: "Failed" },
];

export default function AchTransactionsPage() {
  const { shopId } = useShop();

  const [status, setStatus] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0, totalPages: 1 });

  const loadTransactions = useCallback(
    async (page = 1, pageSize = pagination.pageSize) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, unknown> = { shopId, page, limit: pageSize };
        if (status) params.status = status;
        if (dateRange?.from && dateRange?.to) {
          params.startDate = new Date(dateRange.from.setHours(0, 0, 0, 0)).toISOString();
          params.endDate = new Date(dateRange.to.setHours(23, 59, 59, 999)).toISOString();
        }

        const res = await fetchAchTransactions(params);
        setRows(res?.data?.transactions ?? []);
        const pd = res?.data?.pagination ?? {};
        setPagination({
          current: pd.currentPage ?? page,
          pageSize: pd.limit ?? pageSize,
          total: pd.totalEntries ?? 0,
          totalPages: pd.totalPages ?? 1,
        });
      } finally {
        setLoading(false);
      }
    },
    [shopId, status, dateRange, pagination.pageSize]
  );

  useEffect(() => {
    loadTransactions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, status, dateRange]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Audit Logs</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>ACH Transactions</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          items={STATUS_OPTIONS}
          value={status || "__all__"}
          onValueChange={(v) => setStatus(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangePicker value={dateRange} onChange={setDateRange} className="w-64" />

        <Button onClick={() => loadTransactions(1)}>Apply Filters</Button>
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && rows.length > 0} />
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Transaction ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              rows.length === 0 &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-b-0">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && rows.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No transactions found.
                </TableCell>
              </TableRow>
            )}

            {rows.map((row: any, i) => (
              <TableRow
                key={row.transactionId}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
              >
                <TableCell>{row.transactionId}</TableCell>
                <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}</TableCell>
                <TableCell>
                  <Badge variant={row.topic === "transaction_completed" ? "default" : "destructive"}>
                    {row.topic === "transaction_completed" ? "Completed" : "Failed"}
                  </Badge>
                </TableCell>
                <TableCell>${(row.amount ?? 0).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={pagination.current}
        totalPages={pagination.totalPages}
        totalEntries={pagination.total}
        pageSize={pagination.pageSize}
        loading={loading}
        onPageChange={(p: number) => loadTransactions(p)}
        pageSizeOptions={[30, 50, 100, 200]}
        onPageSizeChange={(s) => loadTransactions(1, s)}
      />
    </div>
  );
}
