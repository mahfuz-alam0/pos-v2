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
  CLOSED: "secondary",
};

const PAYMENT_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PAID: "default",
  PARTIAL: "secondary",
  UNPAID: "destructive",
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
    <div className="flex gap-4 p-6">
      <div className={openId ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/inventory-management">Inventory Management</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Purchase Orders</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex overflow-hidden rounded-lg bg-muted p-0.5">
              {(["all", "today", "yesterday", "custom"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDateFilter(opt)}
                  className={`rounded-[7px] px-3 py-1 text-sm capitalize transition-colors ${
                    dateFilter === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {dateFilter === "custom" && <DateRangePicker value={customRange} onChange={setCustomRange} />}
          </div>

          <Input
            placeholder="Transfer ID"
            value={metrcIdInput}
            onChange={(e) => setMetrcIdInput(e.target.value)}
            className="w-40"
          />

          <Input
            placeholder="Product name"
            value={productNameInput}
            onChange={(e) => setProductNameInput(e.target.value)}
            className="w-40"
          />

          <Select
            items={[{ value: "__all__", label: "All Suppliers" }, ...suppliers.map((s) => ({ value: s.id, label: s.name || s.licenseNumber || s.id }))]}
            value={supplierId ?? "__all__"}
            onValueChange={(v) => setSupplierId(v === "__all__" ? null : (v as string))}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Suppliers</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name || s.licenseNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={[
              { value: "__all__", label: "All Status" },
              { value: "OPEN", label: "Open" },
              { value: "CLOSED", label: "Closed" },
            ]}
            value={status ?? "__all__"}
            onValueChange={(v) => setStatus(v === "__all__" ? null : (v as string))}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            items={[
              { value: "__all__", label: "All Payment" },
              { value: "UNPAID", label: "Unpaid" },
              { value: "PARTIAL", label: "Partial" },
              { value: "PAID", label: "Paid" },
            ]}
            value={paymentStatus ?? "__all__"}
            onValueChange={(v) => setPaymentStatus(v === "__all__" ? null : (v as string))}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Payment</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Transfer ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-center">Items Received</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 &&
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
                    No purchase orders found.
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  className={`cursor-pointer border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                  onClick={() => openRow(row.id)}
                >
                  <TableCell>
                    <span className="text-primary hover:underline">{row.metrcId || "-"}</span>
                  </TableCell>
                  <TableCell>{row.supplierNameSnapshot || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[row.status] ?? "outline"}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={PAYMENT_BADGE[row.paymentStatus] ?? "outline"}>{row.paymentStatus}</Badge>
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

      {openId && <PurchaseOrderDetailPanel id={openId} onClose={closeDetail} onChanged={() => loadPurchaseOrders(page)} />}
    </div>
  );
}
