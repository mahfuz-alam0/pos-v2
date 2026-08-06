"use client";

import { useCallback, useEffect, useState } from "react";

import { useShop } from "@/context/shop-context";
import { fetchTransactionEvents } from "@/services/transactions/listEvents";
import { fetchTransactionDrawers } from "@/services/transactions/listDrawers";
import { fetchEmployeesList } from "@/services/employees/list";
import { getShopTimezone, formatToShopTimezone } from "@/util/dateUtil";

import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

type DateFilter = "all" | "today" | "yesterday" | "custom";

const DATE_TABS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "custom", label: "Custom" },
];

function startOfDayInShopTz(date: Date) {
  const tz = getShopTimezone();
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz || undefined });
  return fmt.format(date);
}

export default function TransactionsPage() {
  const { shopId } = useShop();

  const [employees, setEmployees] = useState<{ id: string | number; name: string }[]>([]);
  const [drawers, setDrawers] = useState<{ id: string | number; name: string }[]>([]);

  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [drawerFilter, setDrawerFilter] = useState("");

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 30, total: 0, totalPages: 1 });

  useEffect(() => {
    fetchEmployeesList({ limit: 100 }).then((res) => setEmployees(res?.data?.employees ?? []));
  }, []);

  useEffect(() => {
    if (!shopId) return;
    fetchTransactionDrawers(shopId as string).then((res) => setDrawers(res?.data ?? []));
  }, [shopId]);

  const loadTransactions = useCallback(
    async (page = 1) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, unknown> = { shopId, page, limit: pagination.pageSize };
        if (employeeFilter) params.userId = employeeFilter;
        if (drawerFilter) params.drawerId = drawerFilter;
        if (startDate) params.fromDate = startDate;
        if (endDate) params.toDate = endDate;

        const res = await fetchTransactionEvents(params);
        setRows(res?.data?.activities ?? []);
        const pd = res?.data?.paginationData ?? {};
        setPagination((prev) => ({
          current: page,
          pageSize: prev.pageSize,
          total: pd.totalEntries ?? 0,
          totalPages: pd.totalPages ?? 1,
        }));
      } finally {
        setLoading(false);
      }
    },
    [shopId, employeeFilter, drawerFilter, startDate, endDate, pagination.pageSize]
  );

  useEffect(() => {
    loadTransactions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, employeeFilter, drawerFilter, startDate, endDate]);

  const handleDateFilterChange = (value: DateFilter) => {
    setDateFilter(value);
    if (value === "custom") return;

    const now = new Date();
    if (value === "today") {
      const d = startOfDayInShopTz(now);
      setStartDate(d);
      setEndDate(d);
    } else if (value === "yesterday") {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const d = startOfDayInShopTz(yesterday);
      setStartDate(d);
      setEndDate(d);
    } else {
      setStartDate("");
      setEndDate("");
    }
    setCustomStart(undefined);
    setCustomEnd(undefined);
  };

  const onCustomStartChange = (date: Date | undefined) => {
    setCustomStart(date);
    setStartDate(date ? startOfDayInShopTz(date) : "");
  };

  const onCustomEndChange = (date: Date | undefined) => {
    setCustomEnd(date);
    setEndDate(date ? startOfDayInShopTz(date) : "");
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Audit Logs</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Transactions</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Tabs value={dateFilter} onValueChange={(v) => handleDateFilterChange(v as DateFilter)}>
            <TabsList>
              {DATE_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <DatePicker value={customStart} onChange={onCustomStartChange} placeholder="Start Date" className="w-40" />
              <DatePicker value={customEnd} onChange={onCustomEndChange} placeholder="End Date" className="w-40" />
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Select
            items={[{ value: "__all__", label: "Select Employee" }, ...employees.map((emp) => ({ value: String(emp.id), label: emp.name }))]}
            value={employeeFilter || "__all__"}
            onValueChange={(v) => setEmployeeFilter(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Select Employee</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={String(emp.id)}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={[{ value: "__all__", label: "Select Drawer" }, ...drawers.map((d) => ({ value: String(d.id), label: d.name }))]}
            value={drawerFilter || "__all__"}
            onValueChange={(v) => setDrawerFilter(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Drawer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Select Drawer</SelectItem>
              {drawers.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && rows.length > 0} />
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Transaction ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Money in</TableHead>
              <TableHead>Money out</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Drawer</TableHead>
              <TableHead>Action Performed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              rows.length === 0 &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-b-0">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && rows.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No transactions found.
                </TableCell>
              </TableRow>
            )}

            {rows.map((row: any, i) => (
              <TableRow
                key={row.id}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
              >
                <TableCell className="max-w-62 truncate">{row.id}</TableCell>
                <TableCell>
                  {row.createdAt ? (
                    <div>
                      <div>{formatToShopTimezone(row.createdAt, "MM.DD.YYYY, h:mm A")}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(row.createdAt).toLocaleDateString(undefined, { weekday: "long" })}
                      </div>
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>${(row.cashCredit ?? 0).toFixed(2)}</TableCell>
                <TableCell>${(row.cashDebit ?? 0).toFixed(2)}</TableCell>
                <TableCell>{row.userInfo?.name ?? "-"}</TableCell>
                <TableCell>{row.drawerName ?? "-"}</TableCell>
                <TableCell>{(row.event ?? "").replace(/_/g, " ")}</TableCell>
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
      />
    </div>
  );
}
