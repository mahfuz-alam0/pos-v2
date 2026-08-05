"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";

import { useShop } from "@/context/shop-context";
import { useDebounce } from "@/hooks/useDebounce";
import { fetchPurchaseOrdersList } from "@/services/purchaseOrders/list";
import { fetchSuppliersList } from "@/services/suppliers/list";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import PurchaseOrderDetailPanel from "./PurchaseOrderDetailPanel";
import type { PurchaseOrderRow, SupplierOption } from "./types";

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  OPEN: "default",
  CLOSED: "outline",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  OPEN: "bg-[#E6F7FF] text-primary",
};

const PAYMENT_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PAID: "default",
  PARTIAL: "outline",
  UNPAID: "destructive",
};

const PAYMENT_BADGE_CLASS: Record<string, string> = {
  PARTIAL: "border-amber-400 text-amber-600 dark:border-amber-500 dark:text-amber-400",
};

function fmtDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shopId } = useShop();
  const openId = searchParams.get("id");
  // Keep the last-opened id around while the drawer plays its close animation
  // (the URL param, and thus openId, clears immediately on close).
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    if (openId) setActiveId(openId);
  }, [openId]);

  const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  const [metrcIdInput, setMetrcIdInput] = useState("");
  const debouncedMetrcId = useDebounce(metrcIdInput, 300);
  const [productNameInput, setProductNameInput] = useState("");
  const debouncedProductName = useDebounce(productNameInput, 300);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "custom">("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const dateRange = useCallback(() => {
    const toISO = (d: Date) => d.toISOString().split("T")[0];
    const today = new Date();
    if (dateFilter === "today") return { from: toISO(today), to: toISO(today) };
    if (dateFilter === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: toISO(y), to: toISO(y) };
    }
    if (dateFilter === "custom" && customRange?.from) {
      return { from: toISO(customRange.from), to: toISO(customRange.to ?? customRange.from) };
    }
    return null;
  }, [dateFilter, customRange]);

  const loadPurchaseOrders = useCallback(
    async (targetPage = 1) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = { page: targetPage, limit: PAGE_SIZE };
        if (debouncedMetrcId) params.metrcId = debouncedMetrcId;
        if (debouncedProductName) params.productName = debouncedProductName;
        if (supplierId) params.supplierId = supplierId;
        if (status) params.status = status;
        if (paymentStatus) params.paymentStatus = paymentStatus;
        const range = dateRange();
        if (range) {
          params.startDate = range.from;
          params.endDate = range.to;
        }
        const res = await fetchPurchaseOrdersList(shopId, params);
        setRows(res?.data?.data ?? []);
        const pagination = res?.data?.paginationData;
        setTotalPages(pagination?.totalPages ?? 1);
        setTotalEntries(pagination?.totalEntries ?? (res?.data?.data ?? []).length);
        setPage(targetPage);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load purchase orders");
      } finally {
        setLoading(false);
      }
    },
    [shopId, debouncedMetrcId, debouncedProductName, supplierId, status, paymentStatus, dateRange]
  );

  useEffect(() => {
    loadPurchaseOrders(1);
  }, [loadPurchaseOrders]);

  useEffect(() => {
    if (!shopId) return;
    fetchSuppliersList({ limit: 100 })
      .then((res) => setSuppliers(res?.data ?? []))
      .catch(() => {});
  }, [shopId]);

  const openRow = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", id);
    router.push(`/inventory-management/purchase-orders?${params.toString()}`, { scroll: false });
  };

  const closeDetail = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    router.push(`/inventory-management/purchase-orders${params.toString() ? `?${params}` : ""}`, { scroll: false });
  };

  return (
    <div className="p-6">
      <div className="flex w-full flex-col gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-normal text-text">Purchase Orders</h1>
          <Breadcrumb>
            <BreadcrumbList className="text-sm">
              <BreadcrumbItem>
                <BreadcrumbLink href="/inventory-management">Inventory</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Purchase Orders</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex flex-col gap-5 rounded-xl bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              items={[
                { value: "all", label: "All" },
                { value: "today", label: "Today" },
                { value: "yesterday", label: "Yesterday" },
                { value: "custom", label: "Custom" },
              ]}
              value={dateFilter}
              onValueChange={(v) => setDateFilter(v as typeof dateFilter)}
            >
              <SelectTrigger className="h-10! w-48">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Transfer ID"
              value={metrcIdInput}
              onChange={(e) => setMetrcIdInput(e.target.value)}
              className="h-10 w-48"
            />

            <Input
              placeholder="Product name"
              value={productNameInput}
              onChange={(e) => setProductNameInput(e.target.value)}
              className="h-10 w-48"
            />

            <Select
              items={[{ value: "__all__", label: "Supplier" }, ...suppliers.map((s) => ({ value: s.id, label: s.name || s.licenseNumber || s.id }))]}
              value={supplierId ?? "__all__"}
              onValueChange={(v) => setSupplierId(v === "__all__" ? null : (v as string))}
            >
              <SelectTrigger className="h-10! w-48">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Supplier</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name || s.licenseNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              items={[
                { value: "__all__", label: "Status" },
                { value: "OPEN", label: "Open" },
                { value: "CLOSED", label: "Closed" },
              ]}
              value={status ?? "__all__"}
              onValueChange={(v) => setStatus(v === "__all__" ? null : (v as string))}
            >
              <SelectTrigger className="h-10! w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              items={[
                { value: "__all__", label: "Payment" },
                { value: "UNPAID", label: "Unpaid" },
                { value: "PARTIAL", label: "Partial" },
                { value: "PAID", label: "Paid" },
              ]}
              value={paymentStatus ?? "__all__"}
              onValueChange={(v) => setPaymentStatus(v === "__all__" ? null : (v as string))}
            >
              <SelectTrigger className="h-10! w-48">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Payment</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateFilter === "custom" && <DateRangePicker value={customRange} onChange={setCustomRange} />}

          <div className="overflow-hidden rounded-lg">
          <Table>
            <TableHeader className="[&_tr]:border-b-0 [&_th]:h-14 [&_th]:px-4">
              <TableRow style={{ backgroundColor: "#FAFAFA" }}>
                <TableHead>Transfer ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-center">Items Received</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-foreground/70 [&_td]:px-4 [&_td]:py-3.5">
              {loading && rows.length === 0 &&
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
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
                    No purchase orders found.
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer border-b-0 bg-component-bg shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]"
                  onClick={() => openRow(row.id)}
                >
                  <TableCell>
                    <span className="text-primary hover:underline">{row.metrcId || "-"}</span>
                  </TableCell>
                  <TableCell>{row.supplierNameSnapshot || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_BADGE[row.status] ?? "outline"}
                      className={`rounded-md font-normal ${STATUS_BADGE_CLASS[row.status] ?? ""}`}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={PAYMENT_BADGE[row.paymentStatus] ?? "outline"}
                      className={`rounded-md font-normal ${PAYMENT_BADGE_CLASS[row.paymentStatus] ?? ""}`}
                    >
                      {row.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{fmtDate(row.createdAt)}</TableCell>
                  <TableCell className="text-center font-mono">
                    {row.receivedLineItemCount ?? 0} / {row.lineItemCount ?? 0}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    ${(row.total ?? 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>

          <TablePagination
            page={page}
            totalPages={totalPages}
            totalEntries={totalEntries}
            pageSize={PAGE_SIZE}
            loading={loading}
            onPageChange={loadPurchaseOrders}
          />
        </div>
      </div>

      {activeId && (
        <PurchaseOrderDetailPanel id={activeId} open={!!openId} onClose={closeDetail} onChanged={() => loadPurchaseOrders(page)} />
      )}
    </div>
  );
}
