"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LayoutGrid, TableIcon, Maximize, Minimize, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useShop } from "@/context/shop-context";
import { fetchPendingPreSales } from "@/services/orderAhead/listPresale";
import { listSales } from "@/services/sales/listSales";
import { LIFECYCLE_COLUMNS, SOURCE_OPTIONS, DELIVERY_METHOD_OPTIONS, PAYMENT_STATUS_OPTIONS, sortByCreatedAt, getCustomerName } from "./constants";
import KanbanColumn from "./KanbanColumn";
import OrderAheadTable from "./OrderAheadTable";
import ConfirmOrderDialog from "./ConfirmOrderDialog";
import CancelOrderDialog from "./CancelOrderDialog";
import AssignPackagesDialog from "./AssignPackagesDialog";

const SALE_LIFECYCLE_STATUSES = ["PROCESSING", "PACKAGED_AND_READY", "AWAITING_DRIVER", "OUT_FOR_DELIVERY"];

export default function OrderAheadBoard() {
  const { shopId } = useShop();

  const [viewMode, setViewMode] = useState("KANBAN");
  const [fullscreen, setFullscreen] = useState(false);
  const [sortOrder, setSortOrder] = useState("OLDEST_FIRST");
  const [filters, setFilters] = useState({ source: undefined, deliveryMethod: undefined, lifecycle: undefined, paymentStatus: undefined });
  const [customerSearch, setCustomerSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [preSales, setPreSales] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState({ preSales: true, sales: true });

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);

  const loadPreSales = useCallback(async () => {
    if (!shopId) return;
    setLoading((p) => ({ ...p, preSales: true }));
    try {
      const isPaymentComplete =
        filters.paymentStatus === "PAID_IN_FULL" ? true : filters.paymentStatus === "PENDING" ? false : undefined;
      const isConfirmed = filters.lifecycle === "NEW" ? false : filters.lifecycle === "CONFIRMED" ? true : undefined;

      const res = await fetchPendingPreSales(shopId, {
        source: filters.source,
        deliveryMethod: filters.deliveryMethod,
        isConfirmed,
        isPaymentComplete,
      });
      setPreSales(res?.data?.data?.preSales || []);
    } catch (err) {
      toast.error(err?.message || "Failed to load pre-sale orders");
    } finally {
      setLoading((p) => ({ ...p, preSales: false }));
    }
  }, [shopId, filters]);

  const loadSales = useCallback(async () => {
    if (!shopId) return;
    setLoading((p) => ({ ...p, sales: true }));
    try {
      const salesFilters = [
        { name: "limit", value: 100 },
        { name: "page", value: 1 },
        { name: "isComplete", value: false },
        { name: "isCancelled", value: false },
      ];
      if (filters.source) salesFilters.push({ name: "source", value: filters.source });
      if (filters.deliveryMethod) salesFilters.push({ name: "deliveryMethod", value: filters.deliveryMethod });
      if (filters.paymentStatus) salesFilters.push({ name: "paymentStatus", value: filters.paymentStatus });

      const res = await listSales(salesFilters);
      setSales(res?.data?.data?.sales || []);
    } catch (err) {
      toast.error(err?.message || "Failed to load orders");
    } finally {
      setLoading((p) => ({ ...p, sales: false }));
    }
  }, [shopId, filters]);

  const refreshAll = useCallback(() => {
    loadPreSales();
    loadSales();
  }, [loadPreSales, loadSales]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    document.body.classList.toggle("order-ahead-fullscreen", fullscreen);
    return () => document.body.classList.remove("order-ahead-fullscreen");
  }, [fullscreen]);

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value === "ALL" ? undefined : value }));
  const clearFilters = () => setFilters({ source: undefined, deliveryMethod: undefined, lifecycle: undefined, paymentStatus: undefined });
  const hasFilters = Object.values(filters).some(Boolean);

  const search = customerSearch.trim().toLowerCase();
  const matchesSearch = (name) => !search || (name || "").toLowerCase().includes(search);

  const sortedPreSales = sortByCreatedAt(preSales, sortOrder).filter((p) => matchesSearch(getCustomerName(p)));
  const sortedSales = sortByCreatedAt(sales, sortOrder).filter((s) =>
    matchesSearch(`${s?.customer?.firstName || ""} ${s?.customer?.lastName || ""}`)
  );
  const salesByStatus = (statusId) => sortedSales.filter((s) => s?.status?.statusId === statusId);

  const scrollByColumn = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 300, behavior: "smooth" });
  };

  const cardHandlers = {
    onConfirm: setConfirmTarget,
    onCancel: setCancelTarget,
    onAssignPackages: setAssignTarget,
    onRefresh: refreshAll,
  };

  const newOrders = sortedPreSales.filter(
    (p) => p?.info?.source !== "WEEDMAPS" && p?.info?.source !== "LEAFLY" && !p?.info?.saleData?.isConfirmed
  );
  const confirmedOrders = sortedPreSales.filter(
    (p) => p?.info?.source === "WEEDMAPS" || p?.info?.source === "LEAFLY" || p?.info?.saleData?.isConfirmed
  );

  const columns = [
    { key: "NEW", label: "New Orders", accent: "#1791FF", type: "presale", items: newOrders, loading: loading.preSales },
    { key: "CONFIRMED", label: "Confirmed", accent: "#134c85", type: "presale", items: confirmedOrders, loading: loading.preSales },
    ...SALE_LIFECYCLE_STATUSES.map((statusId) => {
      const col = LIFECYCLE_COLUMNS.find((c) => c.key === statusId);
      return { key: statusId, label: col.label, accent: col.accent, type: "sale", items: salesByStatus(statusId), loading: loading.sales };
    }),
  ].filter((col) => !filters.lifecycle || filters.lifecycle === col.key);

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 flex flex-col overflow-hidden bg-background p-4" : "flex flex-col gap-3 p-4"}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-300">
          {preSales.length + sales.length} Orders
        </span>

        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OLDEST_FIRST">Oldest</SelectItem>
            <SelectItem value="NEWEST_FIRST">Newest</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.source ?? "ALL"} onValueChange={(v) => setFilter("source", v)}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sources</SelectItem>
            {SOURCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.deliveryMethod ?? "ALL"} onValueChange={(v) => setFilter("deliveryMethod", v)}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="Order Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {DELIVERY_METHOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.lifecycle ?? "ALL"} onValueChange={(v) => setFilter("lifecycle", v)}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="Lifecycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Stages</SelectItem>
            {LIFECYCLE_COLUMNS.map((o) => (
              <SelectItem key={o.key} value={o.key}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.paymentStatus ?? "ALL"} onValueChange={(v) => setFilter("paymentStatus", v)}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Payments</SelectItem>
            {PAYMENT_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}

        <div className="relative w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Search by customer..."
            className="h-8 pl-8"
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="flex items-center overflow-hidden rounded-md border">
            <Button
              variant={viewMode === "KANBAN" ? "default" : "ghost"}
              size="icon-sm"
              className="rounded-none"
              onClick={() => setViewMode("KANBAN")}
              aria-label="Card view"
            >
              <LayoutGrid />
            </Button>
            <Button
              variant={viewMode === "TABLE" ? "default" : "ghost"}
              size="icon-sm"
              className="rounded-none"
              onClick={() => setViewMode("TABLE")}
              aria-label="Table view"
            >
              <TableIcon />
            </Button>
          </div>
          <Button variant="outline" size="icon-sm" onClick={() => setFullscreen((f) => !f)} aria-label="Toggle fullscreen">
            {fullscreen ? <Minimize /> : <Maximize />}
          </Button>
        </div>
      </div>

      <div className="border-t" />

      <div className="min-h-0 flex-1 overflow-hidden">
        {viewMode === "TABLE" ? (
          <div className="h-full overflow-y-auto">
            <OrderAheadTable
              preSales={sortedPreSales}
              sales={sortedSales}
              loading={loading.preSales || loading.sales}
              {...cardHandlers}
            />
          </div>
        ) : (
          <div className="relative flex h-full items-stretch gap-2">
            <Button
              variant="secondary"
              size="icon-sm"
              className="z-10 mt-[45%] shrink-0 rounded-full shadow"
              onClick={() => scrollByColumn(-1)}
              aria-label="Scroll left"
            >
              <ChevronLeft />
            </Button>

            <div ref={scrollRef} className="flex h-full flex-1 gap-3 overflow-x-auto scroll-smooth">
              {columns.map((col) => (
                <div key={col.key} className="w-[340px] shrink-0">
                  <KanbanColumn
                    label={col.label}
                    accent={col.accent}
                    type={col.type}
                    loading={col.loading}
                    items={col.items}
                    count={col.items.length}
                    {...cardHandlers}
                  />
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              size="icon-sm"
              className="z-10 mt-[45%] shrink-0 rounded-full shadow"
              onClick={() => scrollByColumn(1)}
              aria-label="Scroll right"
            >
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>

      <ConfirmOrderDialog
        open={!!confirmTarget}
        preSale={confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirmed={refreshAll}
      />
      <CancelOrderDialog
        open={!!cancelTarget}
        preSale={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={refreshAll}
      />
      <AssignPackagesDialog
        open={!!assignTarget}
        preSale={assignTarget}
        onClose={() => setAssignTarget(null)}
        onAssigned={refreshAll}
      />
    </div>
  );
}
