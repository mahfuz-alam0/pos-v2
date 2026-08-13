"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchTransactionEvents } from "@/services/transactions/listEvents";
import { getSingleSale } from "@/services/sales/getSingleSales";
import { getSessionOrderDetails } from "@/services/drawers/getSessionOrders";
import { fetchEmployeesList } from "@/services/employees/list";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiApiSelect } from "@/components/ui/multi-api-select";
import Drawer from "@/components/ui/Drawer";
import { OrderDetail } from "@/components/admin/SalesTable";
import EditTransactionDrawer from "./EditTransactionDrawer";
import { useSettings } from "@/context/settings-context";

const EVENT_LABELS: Record<string, string> = {
  CASH_WITHDRAWAL: "Cash Withdrawal",
  CASH_DEPOSITED: "Cash Deposited",
  VIRTUAL_DEPOSITED: "Virtual Deposited",
  VIRTUAL_RETURNED: "Virtual Returned",
  CASH_RETURNED: "Cash Returned",
  MOVED_TO_VAULT: "Moved To Vault",
  MANUAL_ADJUSTMENT: "Manual Adjustment",
  PAYMENT_PROCESSING_CHARGE: "Payment Processing Charge",
  PAYMENT_PROCESSING_DISCOUNT: "Payment Processing Discount",
};

const EVENT_TYPE_OPTIONS = Object.entries(EVENT_LABELS).map(([id, name]) => ({ id, name }));

const AMOUNT_COMPARATORS = [
  { value: "LTEQ", label: "Less Than Equal" },
  { value: "LT", label: "Less Than" },
  { value: "GTEQ", label: "Greater Than Equal" },
  { value: "GT", label: "Greater Than" },
  { value: "EQ", label: "Equal" },
];

function money(v: number | undefined) {
  return `$${(v ?? 0).toFixed(2)}`;
}

// Matches old POS's order Status/Payment Tag colors (antd cyan/orange/green).
export const STATUS_BADGE_CLASS = {
  COMPLETED: "rounded-md border-transparent bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-300",
  OTHER: "rounded-md border-transparent bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
};
const PAYMENT_BADGE_CLASS = {
  CASH: "rounded-md border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  VIRTUAL: "rounded-md border-sky-300 bg-sky-50 text-sky-600 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300",
};

const emptyFilters = { userId: "", paymentMethod: "", eventTypes: [] as string[], amount: "", amountComparator: "EQ" };

type DateType = "all" | "today" | "yesterday" | "custom";

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

// All Transactions' date range, mirroring old POS's All/Today/Yesterday/Custom toggle.
function dateRangeFor(dateType: DateType, customFrom: string, customTo: string): { fromDate?: string; toDate?: string } {
  if (dateType === "today") {
    const d = isoDate(new Date());
    return { fromDate: d, toDate: d };
  }
  if (dateType === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const s = isoDate(d);
    return { fromDate: s, toDate: s };
  }
  if (dateType === "custom" && customFrom && customTo) {
    return { fromDate: customFrom, toDate: customTo };
  }
  return {};
}

interface DrawerTransactionsTableProps {
  drawerId: string;
  forActiveSessionOnly?: boolean;
  refreshKey?: number;
  onChanged?: () => void;
}

export default function DrawerTransactionsTable({
  drawerId,
  forActiveSessionOnly = false,
  refreshKey = 0,
  onChanged,
}: DrawerTransactionsTableProps) {
  const { defaultPageSize } = useSettings();
  const { shopId } = useShop();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: defaultPageSize, total: 0, totalPages: 1 });
  const [editTarget, setEditTarget] = useState<any>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const [employees, setEmployees] = useState<any[]>([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [dateType, setDateType] = useState<DateType>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const hasActiveFilters = forActiveSessionOnly
    ? !!filters.userId || !!filters.paymentMethod || filters.eventTypes.length > 0 || !!filters.amount
    : !!filters.userId || filters.eventTypes.length > 0 || dateType !== "all";

  const resetFilters = () => {
    setFilters(emptyFilters);
    setDateType("all");
    setCustomFrom("");
    setCustomTo("");
  };

  const [viewMode, setViewMode] = useState<"orders" | "transactions">("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const ordersFetchGen = useRef(0);
  const [apiSummary, setApiSummary] = useState<{ cashIn: number; cashOut: number; virtualIn: number; virtualOut: number } | null>(null);

  useEffect(() => {
    fetchEmployeesList({ limit: 100 }).then((res) => setEmployees(res?.data?.employees ?? []));
  }, []);

  const openOrder = (id: string) => {
    setSelectedOrderId(id);
    setSelectedOrder(null);
    getSingleSale(id).then((res) => setSelectedOrder(res?.data?.data?.sale ?? null));
  };

  const load = useCallback(
    async (page = 1, size = pagination.pageSize) => {
      if (!shopId || !drawerId) return;
      setLoading(true);
      try {
        const res = await fetchTransactionEvents({
          shopId,
          drawerId,
          forActiveSessionOnly,
          page,
          limit: size,
          userId: filters.userId || undefined,
          paymentType: filters.paymentMethod || undefined,
          eventTypes: filters.eventTypes.length > 0 ? filters.eventTypes : undefined,
          amount: filters.amount ? parseFloat(filters.amount) : undefined,
          amountComparator: filters.amount ? filters.amountComparator : undefined,
          ...(forActiveSessionOnly ? {} : dateRangeFor(dateType, customFrom, customTo)),
        });
        setRows(res?.data?.activities ?? []);
        setApiSummary(res?.data?.summary ?? null);
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
    [shopId, drawerId, forActiveSessionOnly, pagination.pageSize, filters, dateType, customFrom, customTo]
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, drawerId, forActiveSessionOnly, refreshKey, filters, dateType, customFrom, customTo]);

  // Order View groups this same page of transactions by their linked order —
  // one session-orders lookup per transaction (ponytail: N calls for N rows,
  // fine at the current ~100/page cap; batch server-side if that page size grows).
  useEffect(() => {
    if (viewMode !== "orders" || rows.length === 0) {
      setOrders([]);
      return;
    }
    const gen = ++ordersFetchGen.current;
    setOrdersLoading(true);
    Promise.allSettled(
      rows
        .filter((tx) => tx.sessionId)
        .map((tx) => getSessionOrderDetails(tx.sessionId, shopId as string, tx.id).then((res) => ({ tx, res })))
    ).then((settled) => {
      if (gen !== ordersFetchGen.current) return;
      const seen = new Set<string>();
      const next: any[] = [];
      for (const item of settled) {
        if (item.status !== "fulfilled") continue;
        const { tx, res } = item.value;
        for (const order of res?.data?.data?.orders ?? []) {
          if (seen.has(order.id)) continue;
          seen.add(order.id);
          next.push({ ...order, _transaction: tx });
        }
      }
      setOrders(next);
      setOrdersLoading(false);
    });
  }, [viewMode, rows, shopId]);

  // Ported from old POS's generatePDFFromData (transactions-currentlist.js) —
  // same columns, same page-overflow handling, real jsPDF output rather than
  // a same-named CSV. Always exports the raw transaction rows, same as old
  // POS did regardless of which view (Order/Transaction) is on screen.
  const handleExportPdf = async () => {
    if (rows.length === 0) return;
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    const pageHeight = pdf.internal.pageSize.height;
    const pageWidth = pdf.internal.pageSize.width;
    let y = 20;

    pdf.setFontSize(18);
    pdf.text("DRAWER TRANSACTIONS REPORT", 20, y);
    y += 15;

    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, y);
    y += 6;
    pdf.text(`Drawer ID: ${drawerId}`, 20, y);
    y += 6;
    pdf.text(`Total Transactions: ${rows.length}`, 20, y);
    y += 15;

    const headers = ["Event", "Cash In", "Cash Out", "Virtual In", "Virtual Out", "User", "Date", "Time"];
    const colWidths = [30, 20, 20, 20, 20, 25, 25, 25];

    const drawHeaderRow = () => {
      pdf.setFontSize(8);
      let x = 20;
      headers.forEach((h, i) => {
        pdf.text(h, x, y);
        x += colWidths[i];
      });
      y += 8;
      pdf.line(20, y - 2, pageWidth - 20, y - 2);
      y += 3;
    };
    drawHeaderRow();

    rows.forEach((r) => {
      if (y > pageHeight - 30) {
        pdf.addPage();
        y = 20;
        drawHeaderRow();
      }
      const cells = [
        EVENT_LABELS[r.event] ?? r.event ?? "N/A",
        money(r.cashCredit),
        money(r.cashDebit),
        money(r.virtualCredit),
        money(r.virtualDebit),
        r.userInfo?.name ?? "N/A",
        r.loggedDate ? new Date(r.loggedDate).toLocaleDateString() : "N/A",
        r.loggedTime ?? "N/A",
      ];
      let x = 20;
      cells.forEach((cell, i) => {
        const text = String(cell);
        const maxChars = Math.floor(colWidths[i] / 1.2);
        pdf.text(text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text, x, y);
        x += colWidths[i];
      });
      y += 6;
    });

    y += 10;
    pdf.line(20, y, pageWidth - 20, y);
    y += 8;
    pdf.text(`End of Report - Total Transactions: ${rows.length}`, 20, y);

    pdf.save(`drawer-transactions-${drawerId}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {!forActiveSessionOnly && (
          <>
            <div className="flex rounded-lg bg-muted p-0.5">
              {(["all", "today", "yesterday", "custom"] as DateType[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDateType(d)}
                  className={`rounded-[7px] px-3 py-1.5 text-sm font-medium capitalize transition-colors ${dateType === d ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60"}`}
                >
                  {d}
                </button>
              ))}
            </div>
            {dateType === "custom" && (
              <>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-10 w-40" />
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-10 w-40" />
              </>
            )}
          </>
        )}

        <Select
          items={[{ value: "__all__", label: "Select Employee" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]}
          value={filters.userId || "__all__"}
          onValueChange={(v) => setFilters((f) => ({ ...f, userId: v === "__all__" ? "" : v }))}
        >
          <SelectTrigger className="h-10! w-44">
            <SelectValue placeholder="Select Employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Select Employee</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {forActiveSessionOnly && (
          <Select
            items={[
              { value: "__all__", label: "Payment Method" },
              { value: "CASH", label: "Cash" },
              { value: "VIRTUAL", label: "Virtual" },
            ]}
            value={filters.paymentMethod || "__all__"}
            onValueChange={(v) => setFilters((f) => ({ ...f, paymentMethod: v === "__all__" ? "" : v }))}
          >
            <SelectTrigger className="h-10! w-40">
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Payment Method</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="VIRTUAL">Virtual</SelectItem>
            </SelectContent>
          </Select>
        )}

        <MultiApiSelect
          placeholder="Select Event Types"
          value={filters.eventTypes}
          onChange={(v) => setFilters((f) => ({ ...f, eventTypes: v }))}
          items={EVENT_TYPE_OPTIONS}
          triggerClassName="h-10 w-48"
        />

        {forActiveSessionOnly && (
          <div className="flex">
            <Input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={filters.amount}
              onChange={(e) => setFilters((f) => ({ ...f, amount: e.target.value }))}
              className="h-10 w-28 rounded-r-none"
            />
            <Select
              items={AMOUNT_COMPARATORS}
              value={filters.amountComparator}
              onValueChange={(v) => setFilters((f) => ({ ...f, amountComparator: v }))}
            >
              <SelectTrigger className="h-10! w-36 rounded-l-none border-l-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AMOUNT_COMPARATORS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {hasActiveFilters && (
          <Button variant="destructive" className="h-9! rounded! px-3.5! text-[14px]! font-normal!" onClick={resetFilters}>
            Reset
          </Button>
        )}

        {forActiveSessionOnly && (
          <Button className="h-9! rounded! px-3.5! text-[14px]! font-normal!" onClick={handleExportPdf}>
            Export PDF
          </Button>
        )}

        <Select items={[{ value: "orders", label: "Order View" }, { value: "transactions", label: "Transaction View" }]} value={viewMode} onValueChange={(v) => setViewMode(v as "orders" | "transactions")}>
          <SelectTrigger className="h-10! ml-auto w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="orders">Order View</SelectItem>
            <SelectItem value="transactions">Transaction View</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!forActiveSessionOnly &&
        (viewMode === "transactions" ? (
          rows.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span className="font-semibold text-muted-foreground">
                Showing {rows.length} of {pagination.total} — Total:
              </span>
              <span>
                Cash In: <strong className="text-emerald-600">{money(apiSummary?.cashIn ?? rows.reduce((a, t) => a + (t.cashCredit ?? 0), 0))}</strong>
              </span>
              <span>
                Cash Out: <strong className="text-destructive">{money(apiSummary?.cashOut ?? rows.reduce((a, t) => a + (t.cashDebit ?? 0), 0))}</strong>
              </span>
              <span>
                Virtual In: <strong className="text-sky-600">{money(apiSummary?.virtualIn ?? rows.reduce((a, t) => a + (t.virtualCredit ?? 0), 0))}</strong>
              </span>
              <span>
                Virtual Out: <strong className="text-amber-600">{money(apiSummary?.virtualOut ?? rows.reduce((a, t) => a + (t.virtualDebit ?? 0), 0))}</strong>
              </span>
            </div>
          )
        ) : (
          orders.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Showing {orders.length} orders — Page total:</span>
              <strong className="text-primary">{money(orders.reduce((s, o) => s + (o.total ?? 0), 0))}</strong>
            </div>
          )
        ))}

      {viewMode === "transactions" ? (
        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Order ID</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Cash In</TableHead>
                <TableHead className="text-right">Cash Out</TableHead>
                <TableHead className="text-right">Virtual In</TableHead>
                <TableHead className="text-right">Virtual Out</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                rows.length === 0 &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-b-0">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                >
                  <TableCell>
                    {row.orderId ? (
                      <button type="button" className="font-medium text-primary hover:underline" onClick={() => openOrder(row.orderId)}>
                        {row.orderAdvertisedId ?? `${row.orderId.slice(0, 8)}...`}
                      </button>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {row.loggedDate ? new Date(row.loggedDate).toLocaleDateString() : "-"} {row.loggedTime}
                  </TableCell>
                  <TableCell>{EVENT_LABELS[row.event] ?? row.event}</TableCell>
                  <TableCell>{row.userInfo?.name ?? "-"}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">
                    {row.cashCredit ? money(row.cashCredit) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    {row.cashDebit ? money(row.cashDebit) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">
                    {row.virtualCredit ? money(row.virtualCredit) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    {row.virtualDebit ? money(row.virtualDebit) : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="outline" size="icon-sm" onClick={() => setEditTarget(row)}>
                      <Pencil className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={ordersLoading && orders.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order Type</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Placed At</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(loading || ordersLoading) &&
                orders.length === 0 &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-b-0">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && !ordersLoading && orders.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              )}

              {orders.map((row, i) => {
                const isVirtual = (row._transaction?.virtualCredit ?? 0) > 0 || (row._transaction?.virtualDebit ?? 0) > 0;
                return (
                  <TableRow
                    key={row.id}
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                  >
                    <TableCell>
                      <button type="button" className="font-medium text-primary hover:underline" onClick={() => openOrder(row.id)}>
                        {row.advertisedId ?? `${row.id?.slice(0, 8)}...`}
                      </button>
                    </TableCell>
                    <TableCell>{row.customer?.name ?? "N/A"}</TableCell>
                    <TableCell>
                      <Badge className={row.status === "COMPLETED" ? STATUS_BADGE_CLASS.COMPLETED : STATUS_BADGE_CLASS.OTHER}>
                        {row.status ? row.status.charAt(0) + row.status.slice(1).toLowerCase() : "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.orderType ? row.orderType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={isVirtual ? PAYMENT_BADGE_CLASS.VIRTUAL : PAYMENT_BADGE_CLASS.CASH}>
                        {isVirtual ? "Virtual" : "Cash"}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.placedAt ? new Date(row.placedAt).toLocaleString() : "N/A"}</TableCell>
                    <TableCell className="text-center">{row.items?.length ?? 0}</TableCell>
                    <TableCell className="text-right font-semibold">{money(row.total)}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="outline" size="icon-sm" disabled={!row._transaction} onClick={() => setEditTarget(row._transaction)}>
                        <Pencil className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TablePagination
        page={pagination.current}
        totalPages={pagination.totalPages}
        totalEntries={pagination.total}
        pageSize={pagination.pageSize}
        loading={loading}
        onPageChange={(p: number) => load(p)}
        pageSizeOptions={[30, 50, 100, 200]}
        onPageSizeChange={(s) => {
          setPagination((prev) => ({ ...prev, pageSize: s, current: 1 }));
          load(1, s);
        }}
      />

      <EditTransactionDrawer
        transaction={editTarget}
        drawerId={drawerId}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null);
          load(pagination.current);
          onChanged?.();
        }}
      />

      <Drawer open={!!selectedOrderId} onClose={() => { setSelectedOrderId(null); setSelectedOrder(null); }} side="right" size={540} className="overflow-auto">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold">Order # {selectedOrder?.advertisedId ?? ""}</h2>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedOrderId(null); setSelectedOrder(null); }}>
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {selectedOrder ? <OrderDetail order={selectedOrder} /> : <div className="py-24 text-center text-muted-foreground">Loading…</div>}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
