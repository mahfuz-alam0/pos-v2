"use client";

import { useCallback, useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

import { useShop } from "@/context/shop-context";
import { fetchVaultTransactions } from "@/services/vault/listTransactions";
import { fetchVaultSummary } from "@/services/vault/getSummary";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

import VaultTransactionDetails from "./VaultTransactionDetails";
import VaultActionDialog from "./VaultActionDialog";
import TransferFromDrawerDialog from "./TransferFromDrawerDialog";

type DateRangeFilter = "ALL" | "WEEK" | "MONTH" | "YEAR" | "CUSTOM";

const DATE_RANGE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: "ALL", label: "All Time" },
  { value: "WEEK", label: "Week" },
  { value: "MONTH", label: "Month" },
  { value: "YEAR", label: "Year" },
  { value: "CUSTOM", label: "Custom" },
];

const DATE_RANGE_DAYS: Record<DateRangeFilter, number | null> = {
  ALL: null,
  WEEK: 7,
  MONTH: 30,
  YEAR: 365,
  CUSTOM: null,
};

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function CashManagementPage() {
  const { shopId } = useShop();

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 30, total: 0, totalPages: 1 });

  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("ALL");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [appliedFilters, setAppliedFilters] = useState<{ fromDate?: string; toDate?: string }>({});

  const [vaultSummary, setVaultSummary] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    fetchVaultSummary(shopId as string).then((res) => setVaultSummary(res?.data ?? null));
  }, [shopId]);

  const loadTransactions = useCallback(
    async (page = 1, size = pagination.pageSize) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const res = await fetchVaultTransactions(shopId as string, {
          page,
          limit: size,
          ...appliedFilters,
        });
        setRows(res?.data?.activities ?? []);
        const pd = res?.data?.paginationData ?? {};
        setPagination((prev) => ({
          current: pd.currentPage ?? page,
          pageSize: pd.limit ?? prev.pageSize,
          total: pd.totalEntries ?? 0,
          totalPages: pd.totalPages ?? 1,
        }));
      } finally {
        setLoading(false);
      }
    },
    [shopId, appliedFilters, pagination.pageSize]
  );

  useEffect(() => {
    loadTransactions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, appliedFilters]);

  const handleSearch = () => {
    if (dateRangeFilter === "ALL") {
      setAppliedFilters({});
      return;
    }
    if (dateRangeFilter === "CUSTOM") {
      if (!customRange?.from || !customRange?.to) return;
      setAppliedFilters({ fromDate: toISODate(customRange.from), toDate: toISODate(customRange.to) });
      return;
    }
    const days = DATE_RANGE_DAYS[dateRangeFilter]!;
    const from = new Date();
    from.setDate(from.getDate() - days);
    setAppliedFilters({ fromDate: toISODate(from), toDate: toISODate(new Date()) });
  };

  const refresh = () => loadTransactions(pagination.current);

  return (
    <div className="flex gap-4 p-6">
      <div className={selectedTransaction ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Cash Management</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Main Vault</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center gap-2 text-sm font-medium">
            <span>Vault Current Balance:</span>
            <span>${(vaultSummary?.currentCashAmount ?? 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              items={DATE_RANGE_OPTIONS}
              value={dateRangeFilter}
              onValueChange={(v) => setDateRangeFilter(v as DateRangeFilter)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {dateRangeFilter === "CUSTOM" && (
              <DateRangePicker value={customRange} onChange={setCustomRange} className="w-64" />
            )}

            <Button onClick={handleSearch}>Search</Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setDepositOpen(true)}>Deposit</Button>
            <Button onClick={() => setWithdrawOpen(true)}>Withdrawal</Button>
            <Button onClick={() => setTransferOpen(true)}>Transfer From Drawer</Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Transferred By</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Date Time</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                rows.length === 0 &&
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-b-0">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row: any, i) => (
                <TableRow
                  key={row.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                >
                  <TableCell>
                    <button className="flex items-center gap-2 text-primary hover:underline" onClick={() => setSelectedTransaction(row)}>
                      <img src={row?.userInfo?.avatarUrl} alt="" className="size-6 rounded-full border border-foreground/10" />
                      {row?.userInfo?.name ?? "-"}
                    </button>
                  </TableCell>
                  <TableCell>{row.id}</TableCell>
                  <TableCell>{row.event === "WITHDRAW_CASH" ? "Withdrawal" : "Deposit"}</TableCell>
                  <TableCell>
                    {row.loggedDate ? new Date(row.loggedDate).toLocaleDateString() : "-"} {row.loggedTime}
                    {row.loggedTimeZone ? ` (${row.loggedTimeZone})` : ""}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {((row.cashIn ?? 0) - (row.cashOut ?? 0)).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </TableCell>
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
          onPageSizeChange={(s) => {
            setPagination((prev) => ({ ...prev, pageSize: s, current: 1 }));
            loadTransactions(1, s);
          }}
        />
      </div>

      {selectedTransaction && (
        <div className="w-1/3">
          <VaultTransactionDetails transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} />
        </div>
      )}

      <VaultActionDialog open={depositOpen} mode="deposit" onClose={() => setDepositOpen(false)} onDone={refresh} />
      <VaultActionDialog open={withdrawOpen} mode="withdraw" onClose={() => setWithdrawOpen(false)} onDone={refresh} />
      <TransferFromDrawerDialog open={transferOpen} onClose={() => setTransferOpen(false)} onDone={refresh} />
    </div>
  );
}
