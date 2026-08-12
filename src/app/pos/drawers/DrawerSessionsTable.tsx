"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { listDrawerSessions } from "@/services/drawers/listSessions";
import { getSessionOrderDetails } from "@/services/drawers/getSessionOrders";
import { getSingleSale } from "@/services/sales/getSingleSales";
import { fetchEmployeesList } from "@/services/employees/list";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { OrderDetail } from "@/components/admin/SalesTable";
import SessionDetailDrawer from "./SessionDetailDrawer";
import { useSettings } from "@/context/settings-context";

function money(v: number | undefined) {
  return `$${(v ?? 0).toFixed(2)}`;
}

function fmtDateTime(v: string | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  return { date: d.toLocaleDateString(), time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) };
}

// Inline order list for one expanded session — matches SalesTable's own
// order columns/styling rather than reinventing a second table look.
function SessionOrdersRow({ orders, loading, onOpenOrder }: { orders: any[] | null; loading: boolean; onOpenOrder: (id: string) => void }) {
  if (loading) return <div className="px-4 py-3 text-sm text-muted-foreground">Loading orders…</div>;
  if (!orders) return <div className="px-4 py-3 text-sm text-muted-foreground">Failed to load orders.</div>;
  if (orders.length === 0) return <div className="px-4 py-3 text-sm text-muted-foreground">No orders linked to this session.</div>;

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
      <Table>
        <TableHeader className="[&_tr]:border-b-0">
          <TableRow className="bg-muted/60">
            <TableHead>Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Order Type</TableHead>
            <TableHead>Placed At</TableHead>
            <TableHead className="text-center">No. of Items</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((row, i) => (
            <TableRow key={row.id ?? i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
              <TableCell>
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => onOpenOrder(row.id)}>
                  {row.advertisedId ?? `${row.id?.slice(0, 8)}...`}
                </button>
              </TableCell>
              <TableCell>{row.customer?.name ?? "-"}</TableCell>
              <TableCell>
                <Badge variant={row.status === "COMPLETED" ? "default" : "secondary"}>
                  {row.status ? row.status.charAt(0) + row.status.slice(1).toLowerCase() : "-"}
                </Badge>
              </TableCell>
              <TableCell>{row.orderType ? row.orderType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : "-"}</TableCell>
              <TableCell>{row.placedAt ? new Date(row.placedAt).toLocaleString() : "-"}</TableCell>
              <TableCell className="text-center">{row.items?.length ?? 0}</TableCell>
              <TableCell className="text-right font-semibold">{money(row.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function DrawerSessionsTable({ drawerId, drawerName, refreshKey = 0 }: { drawerId: string; drawerName?: string; refreshKey?: number }) {
  const { defaultPageSize } = useSettings();
  const { shopId } = useShop();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: defaultPageSize, total: 0, totalPages: 1 });
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const [openedByUserId, setOpenedByUserId] = useState("");
  const [closedByUserId, setClosedByUserId] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Keyed by session id — avoids refetching orders every time a row is re-expanded.
  const [ordersCache, setOrdersCache] = useState<Record<string, { loading: boolean; orders: any[] | null }>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    fetchEmployeesList({ limit: 100 }).then((res) => setEmployees(res?.data?.employees ?? []));
  }, []);

  const load = useCallback(
    async (page = 1, size = pagination.pageSize) => {
      if (!shopId || !drawerId) return;
      setLoading(true);
      try {
        const params = {
          shopId,
          drawerId,
          page,
          limit: size,
          openedByUserId: openedByUserId || undefined,
          closedByUserId: closedByUserId || undefined,
        };
        // ponytail: temporary diagnostic for the "0 sessions" report — remove
        // once the empty-result cause is confirmed.
        console.log("[DrawerSessionsTable] request params:", params);
        const res = await listDrawerSessions(params);
        console.log("[DrawerSessionsTable] response:", res);
        setRows(res?.data?.sessions ?? []);
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
    [shopId, drawerId, pagination.pageSize, openedByUserId, closedByUserId]
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, drawerId, refreshKey, openedByUserId, closedByUserId]);

  const toggleExpand = (session: any) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(session.id)) next.delete(session.id);
      else next.add(session.id);
      return next;
    });
    if (ordersCache[session.id]) return;
    setOrdersCache((prev) => ({ ...prev, [session.id]: { loading: true, orders: null } }));
    getSessionOrderDetails(session.id, shopId as string)
      .then((res) => {
        setOrdersCache((prev) => ({ ...prev, [session.id]: { loading: false, orders: res?.data?.data?.orders ?? [] } }));
      })
      .catch(() => {
        setOrdersCache((prev) => ({ ...prev, [session.id]: { loading: false, orders: null } }));
      });
  };

  const openOrder = (id: string) => {
    setSelectedOrderId(id);
    setSelectedOrder(null);
    getSingleSale(id).then((res) => setSelectedOrder(res?.data?.data?.sale ?? null));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-48">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Open By</label>
          <Select
            items={[{ value: "__all__", label: "Select Employee" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]}
            value={openedByUserId || "__all__"}
            onValueChange={(v) => setOpenedByUserId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-10! w-full">
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
        </div>
        <div className="w-48">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Closed By</label>
          <Select
            items={[{ value: "__all__", label: "Select Employee" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]}
            value={closedByUserId || "__all__"}
            onValueChange={(v) => setClosedByUserId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-10! w-full">
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
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && rows.length > 0} />
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead className="w-10" />
              <TableHead>Open By</TableHead>
              <TableHead>Closed By</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Adjustment</TableHead>
              <TableHead className="text-right">Opening Cash</TableHead>
              <TableHead className="text-right">Opening Virtual</TableHead>
              <TableHead className="text-right">Closing Cash</TableHead>
              <TableHead className="text-right">Closing Virtual</TableHead>
              <TableHead className="text-right">Adjusted Cash</TableHead>
              <TableHead className="text-right">Adjusted Virtual</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              rows.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-b-0">
                  {Array.from({ length: 12 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && rows.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={12} className="py-10 text-center text-muted-foreground">
                  No sessions found.
                </TableCell>
              </TableRow>
            )}

            {rows.map((row, i) => {
              const expanded = expandedIds.has(row.id);
              const cache = ordersCache[row.id];
              const time = fmtDateTime(row.createdAt);
              return (
                <Fragment key={row.id}>
                  <TableRow
                    className={`cursor-pointer border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                    onClick={() => setSelectedSession(row)}
                  >
                    <TableCell onClick={(e) => { e.stopPropagation(); toggleExpand(row); }}>
                      <Button variant="outline" size="icon-sm">
                        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </Button>
                    </TableCell>
                    <TableCell>{row.openedBy?.name ?? "-"}</TableCell>
                    <TableCell>{row.closedBy?.name ?? "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.isOpen ? "default" : "destructive"}>{row.isOpen ? "Open" : "Closed"}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.isAdjustmentPending ? <Badge variant="destructive">Pending</Badge> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono">{money(row.startingCashBalance)}</TableCell>
                    <TableCell className="text-right font-mono">{money(row.startingVirtualBalance)}</TableCell>
                    <TableCell className="text-right font-mono">{row.closingCashBalance != null ? money(row.closingCashBalance) : "-"}</TableCell>
                    <TableCell className="text-right font-mono">{row.closingVirtualBalance != null ? money(row.closingVirtualBalance) : "-"}</TableCell>
                    <TableCell className="text-right font-mono">{row.cashAdjustment ? money(row.cashAdjustment) : "-"}</TableCell>
                    <TableCell className="text-right font-mono">{row.virtualAdjustment ? money(row.virtualAdjustment) : "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span>{time === "-" ? "-" : time.date}</span>
                        {time !== "-" && <span className="text-muted-foreground">{time.time}</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded && (
                    <TableRow className="border-b-0">
                      <TableCell colSpan={12} className="bg-muted/20 p-3" onClick={(e) => e.stopPropagation()}>
                        <SessionOrdersRow orders={cache?.orders ?? null} loading={cache?.loading ?? true} onOpenOrder={openOrder} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

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

      <SessionDetailDrawer
        session={selectedSession}
        drawerId={drawerId}
        drawerName={drawerName}
        onClose={() => setSelectedSession(null)}
        onApproved={() => {
          setSelectedSession(null);
          load(pagination.current);
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
