"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { useDebounce } from "@/hooks/useDebounce";
import { fetchWithinLocationTransfers } from "@/services/transfers/listWithinLocation";
import { fetchSingleWithinLocationTransfer } from "@/services/transfers/getSingleWithinLocation";
import { fetchStandaloneTransfers } from "@/services/transfers/listStandalone";
import { fetchSingleStandaloneTransfer } from "@/services/transfers/getSingleStandalone";
import { markStandaloneTransferInTransit } from "@/services/transfers/markInTransitStandalone";
import { fetchEmployeesList } from "@/services/employees/list";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import WithinLocationDetailPanel from "./WithinLocationDetailPanel";
import ShopTransferDetailPanel from "./ShopTransferDetailPanel";
import type {
  EmployeeOption,
  PaginationState,
  ShopTransferRow,
  SupplierTransferRow,
  TransferTab,
  WithinLocationTransferRow,
} from "./types";
import type { DateRange } from "react-day-picker";

const DEFAULT_PAGINATION: PaginationState = { limit: 30, page: 1, totalEntries: 0, totalPages: 0 };

function fmtDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" }).replace(/\//g, ".");
}

function fmtDateISO(value?: string) {
  if (!value) return "-";
  return value.split("T")[0];
}

export default function TransfersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shopId } = useShop();
  const openId = searchParams.get("id");

  const [activeTab, setActiveTab] = useState<TransferTab>("within-storage-locations");

  const [withinRows, setWithinRows] = useState<WithinLocationTransferRow[]>([]);
  const [withinLoading, setWithinLoading] = useState(false);
  const [withinPagination, setWithinPagination] = useState<PaginationState>(DEFAULT_PAGINATION);

  const [shopRows, setShopRows] = useState<ShopTransferRow[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopPagination, setShopPagination] = useState<PaginationState>(DEFAULT_PAGINATION);

  const [supplierRows, setSupplierRows] = useState<SupplierTransferRow[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierPagination, setSupplierPagination] = useState<PaginationState>(DEFAULT_PAGINATION);

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "custom">("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const debouncedEmployeeFilter = useDebounce(employeeFilter, 300);

  const [markInTransitLoading, setMarkInTransitLoading] = useState<Record<string, boolean>>({});

  const [withinDetail, setWithinDetail] = useState<any>(null);
  const [shopDetail, setShopDetail] = useState<any>(null);

  const audienceType = useMemo(() => {
    if (activeTab === "with-in-shops") return "SHOP";
    if (activeTab === "supplier-specific") return "SUPPLIER";
    return undefined;
  }, [activeTab]);

  const dateRange = useMemo(() => {
    const today = new Date();
    const toISO = (d: Date) => d.toISOString().split("T")[0];
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

  const buildParams = useCallback(
    (page: number, limit: number) => {
      const params: Record<string, any> = { limit, page };
      if (debouncedEmployeeFilter) params.employeeId = debouncedEmployeeFilter;
      if (dateRange) {
        params.fromDateString = dateRange.from;
        params.toDateString = dateRange.to;
      }
      if (audienceType) params.audienceType = audienceType;
      return params;
    },
    [debouncedEmployeeFilter, dateRange, audienceType]
  );

  const loadWithin = useCallback(
    async (page = 1, limit = DEFAULT_PAGINATION.limit) => {
      if (!shopId) return;
      setWithinLoading(true);
      try {
        const params = buildParams(page, limit);
        delete params.audienceType;
        const res = await fetchWithinLocationTransfers(shopId, params);
        const transfers = res?.data?.transfers ?? [];
        const pag = res?.data?.paginationData ?? {};
        setWithinRows(
          transfers.map((t: any) => ({
            id: t.id,
            createdAt: t.createdAt,
            sourceStorageLocation: t.sourceStorageLocation?.name ?? "-",
            destinationStorageLocation: t.destinationStorageLocation?.name ?? "-",
            initiatedBy: t.initiatedBy,
            advertisedId: t.advertisedId,
          }))
        );
        setWithinPagination({
          limit: pag.limit ?? limit,
          page: pag.currentPage ?? page,
          totalEntries: pag.totalEntries ?? 0,
          totalPages: pag.totalPages ?? 1,
        });
      } catch (err: any) {
        toast.error(err?.message || "Failed to load transfers");
      } finally {
        setWithinLoading(false);
      }
    },
    [shopId, buildParams]
  );

  const loadShopTransfers = useCallback(
    async (page = 1, limit = DEFAULT_PAGINATION.limit) => {
      if (!shopId) return;
      setShopLoading(true);
      try {
        const params = buildParams(page, limit);
        const res = await fetchStandaloneTransfers(shopId, params);
        const transfers = res?.data?.transfers ?? [];
        const pag = res?.data?.paginationData ?? {};
        const rows = await Promise.all(
          transfers.map(async (t: any) => {
            const single = await fetchSingleStandaloneTransfer(t.id, shopId).catch(() => null);
            return {
              id: t.id,
              createdAt: t.createdAt,
              sourceStorageLocation: t.fromShop?.name,
              destinationStorageLocation: t.toShop?.name,
              isIncoming: t.isIncoming,
              advertisedId: t.advertisedId,
              isCompleted: single?.data?.transfer?.isCompleted || false,
            };
          })
        );
        setShopRows(rows);
        setShopPagination({
          limit: pag.limit ?? limit,
          page: pag.currentPage ?? page,
          totalEntries: pag.totalEntries ?? 0,
          totalPages: pag.totalPages ?? 1,
        });
      } catch (err: any) {
        toast.error(err?.message || "Failed to load shop transfers");
      } finally {
        setShopLoading(false);
      }
    },
    [shopId, buildParams]
  );

  const loadSupplierTransfers = useCallback(
    async (page = 1, limit = DEFAULT_PAGINATION.limit) => {
      if (!shopId) return;
      setSupplierLoading(true);
      try {
        const params = buildParams(page, limit);
        const res = await fetchStandaloneTransfers(shopId, params);
        const transfers = res?.data?.transfers ?? [];
        const pag = res?.data?.paginationData ?? {};
        const rows = await Promise.all(
          transfers.map(async (t: any) => {
            const single = await fetchSingleStandaloneTransfer(t.id, shopId).catch(() => null);
            const details = single?.data?.transfer;
            const isTransit = details?.isIncoming ? true : details?.isCompleted ? true : details?.isInTransit;
            return {
              ...t,
              transferType: t.fromSupplier ? "incoming" : t.toSupplier ? "outgoing" : "unknown",
              totalPrice: t.totalPrice || 0,
              numberOfPackages: details?.transferItems?.length || 0,
              isTransit,
              isCompleted: details?.isCompleted || false,
            };
          })
        );
        setSupplierRows(rows);
        setSupplierPagination({
          limit: pag.limit ?? limit,
          page: pag.currentPage ?? page,
          totalEntries: pag.totalEntries ?? 0,
          totalPages: pag.totalPages ?? 1,
        });
      } catch (err: any) {
        toast.error(err?.message || "Failed to load supplier transfers");
      } finally {
        setSupplierLoading(false);
      }
    },
    [shopId, buildParams]
  );

  const refreshActiveTab = useCallback(
    (page = 1) => {
      if (activeTab === "within-storage-locations") loadWithin(page, withinPagination.limit);
      else if (activeTab === "with-in-shops") loadShopTransfers(page, shopPagination.limit);
      else loadSupplierTransfers(page, supplierPagination.limit);
    },
    [activeTab, loadWithin, loadShopTransfers, loadSupplierTransfers, withinPagination.limit, shopPagination.limit, supplierPagination.limit]
  );

  useEffect(() => {
    if (!shopId) return;
    refreshActiveTab(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, activeTab, debouncedEmployeeFilter, dateFilter, customRange]);

  useEffect(() => {
    fetchEmployeesList()
      .then((res) => setEmployees(res?.data?.employees ?? []))
      .catch(() => toast.error("Failed to fetch employees"));
  }, []);

  useEffect(() => {
    if (!openId || !shopId) {
      setWithinDetail(null);
      setShopDetail(null);
      return;
    }
    if (activeTab === "within-storage-locations") {
      fetchSingleWithinLocationTransfer(openId, shopId)
        .then((res) => setWithinDetail(res?.data?.transfer))
        .catch(() => setWithinDetail(null));
    } else {
      fetchSingleStandaloneTransfer(openId, shopId)
        .then((res) => setShopDetail(res?.data?.transfer))
        .catch(() => setShopDetail(null));
    }
  }, [openId, shopId, activeTab]);

  const openRow = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", id);
    router.push(`/inventory-management/transfers?${params.toString()}`, { scroll: false });
  };

  const closeDetail = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    router.push(`/inventory-management/transfers${params.toString() ? `?${params}` : ""}`, { scroll: false });
  };

  const handleMarkInTransit = async (id: string) => {
    if (!shopId) return;
    setMarkInTransitLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await markStandaloneTransferInTransit(id, shopId);
      toast.success("Package successfully marked as in transit");
      refreshActiveTab(supplierPagination.page);
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark package in transit");
    } finally {
      setMarkInTransitLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const anyDetailOpen = Boolean(withinDetail || shopDetail);

  return (
    <div className="p-6">
      <div className="flex gap-4">
        <div className={anyDetailOpen ? "flex w-2/3 flex-col rounded-xl bg-card shadow-md" : "flex w-full flex-col rounded-xl bg-card shadow-md"}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-6 py-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/inventory-management" className="text-muted-foreground">
                    Inventory
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-normal text-primary">Transfers</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Button
              className="h-9! rounded! px-3.5! text-[14px]! font-normal!"
              render={
                <Link href={{ pathname: "/inventory-management/transfers/add-transfer", query: { transferType: activeTab } }} />
              }
            >
              Add Transfer
            </Button>
          </div>

          <div className="flex flex-col gap-4 px-4 pt-3 pb-6">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="inline-flex h-10 rounded-md border border-input">
                  {(["all", "today", "yesterday", "custom"] as const).map((opt, idx) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDateFilter(opt)}
                      className={`flex items-center justify-center px-4 text-sm capitalize transition-colors ${idx !== 0 ? "border-l border-input" : ""} ${
                        dateFilter === opt
                          ? "relative z-10 -mx-px rounded-md border border-primary bg-background text-primary"
                          : "text-foreground/80 hover:bg-muted/40"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {dateFilter === "custom" && (
                  <DateRangePicker value={customRange} onChange={setCustomRange} />
                )}
              </div>

              <Select
                items={[
                  { value: "__all__", label: "Select Employee" },
                  ...employees.map((e) => ({ value: e.id, label: e.name ?? e.id })),
                ]}
                value={employeeFilter ?? "__all__"}
                onValueChange={(v) => setEmployeeFilter(v === "__all__" ? null : (v as string))}
              >
                <SelectTrigger className="h-10! w-52">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Select Employee</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name ?? e.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TransferTab)} className="mt-4">
              <TabsList variant="line">
                <TabsTrigger value="within-storage-locations">Within Storage Locations</TabsTrigger>
                <TabsTrigger value="with-in-shops">Within Shops</TabsTrigger>
                <TabsTrigger value="supplier-specific">Supplier Specific</TabsTrigger>
              </TabsList>
            </Tabs>

            {activeTab === "within-storage-locations" && (
              <>
                <div className="relative overflow-hidden rounded-t-lg">
                  <TableLoadingOverlay show={withinLoading && withinRows.length > 0} />
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50 h-12">
                        <TableHead className="h-12 font-semibold text-muted-foreground">Transfer ID</TableHead>
                        <TableHead className="h-12 font-semibold text-muted-foreground">Initiated By</TableHead>
                        <TableHead className="h-12 font-semibold text-muted-foreground">Source Location</TableHead>
                        <TableHead className="h-12 font-semibold text-muted-foreground">Destination Location</TableHead>
                        <TableHead className="h-12 font-semibold text-muted-foreground">Date Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="[&_td]:py-4.5">
                      {withinLoading && withinRows.length === 0 &&
                        Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={`sk-${i}`} className="border-b border-border">
                            {Array.from({ length: 5 }).map((__, j) => (
                              <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                            ))}
                          </TableRow>
                        ))}
                      {!withinLoading && withinRows.length === 0 && (
                        <TableRow className="border-b border-border">
                          <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                            No transfers found.
                          </TableCell>
                        </TableRow>
                      )}
                      {withinRows.map((row) => (
                        <TableRow key={row.id} className="border-b border-border">
                          <TableCell>
                            <button className="text-primary hover:underline" onClick={() => openRow(row.id)}>
                              {row.advertisedId}
                            </button>
                          </TableCell>
                          <TableCell>{row.initiatedBy?.name || "-"}</TableCell>
                          <TableCell>{row.sourceStorageLocation}</TableCell>
                          <TableCell>{row.destinationStorageLocation}</TableCell>
                          <TableCell>{fmtDateISO(row.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  page={withinPagination.page}
                  totalPages={withinPagination.totalPages}
                  totalEntries={withinPagination.totalEntries}
                  pageSize={withinPagination.limit}
                  loading={withinLoading}
                  onPageChange={(p) => loadWithin(p, withinPagination.limit)}
                  pageSizeOptions={[30, 50, 100, 200]}
                  onPageSizeChange={(s) => loadWithin(1, s)}
                />
              </>
            )}

            {activeTab === "with-in-shops" && (
              <>
                <div className="relative overflow-hidden rounded-t-lg">
                  <TableLoadingOverlay show={shopLoading && shopRows.length > 0} />
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50 h-12">
                        <TableHead className="h-12 font-semibold text-muted-foreground">Transfer ID</TableHead>
                        <TableHead className="h-12 font-semibold text-muted-foreground">Created At</TableHead>
                        <TableHead className="h-12 font-semibold text-muted-foreground">Status</TableHead>
                        <TableHead className="h-12 font-semibold text-muted-foreground">Type</TableHead>
                        <TableHead className="h-12 font-semibold text-muted-foreground">Source Location</TableHead>
                        <TableHead className="h-12 font-semibold text-muted-foreground">Destination Location</TableHead>
                        <TableHead className="h-12 text-center font-semibold text-muted-foreground">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="[&_td]:py-4.5">
                      {shopLoading && shopRows.length === 0 &&
                        Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={`sk-${i}`} className="border-b border-border">
                            {Array.from({ length: 7 }).map((__, j) => (
                              <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                            ))}
                          </TableRow>
                        ))}
                      {!shopLoading && shopRows.length === 0 && (
                        <TableRow className="border-b border-border">
                          <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                            No transfers found.
                          </TableCell>
                        </TableRow>
                      )}
                      {shopRows.map((row) => (
                        <TableRow key={row.id} className="border-b border-border">
                          <TableCell>
                            <button className="text-primary hover:underline" onClick={() => openRow(row.id)}>
                              {row.advertisedId}
                            </button>
                          </TableCell>
                          <TableCell>{fmtDate(row.createdAt)}</TableCell>
                          <TableCell>{row.isCompleted ? "Completed" : "In Route"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="rounded-md"
                              style={
                                row.isIncoming
                                  ? { backgroundColor: "#F5FCED", color: "var(--color-emerald-400)", borderColor: "currentColor" }
                                  : { backgroundColor: "#E6F7FF", color: "var(--color-sky-400)", borderColor: "currentColor" }
                              }
                            >
                              {row.isIncoming ? "Incoming" : "Outgoing"}
                            </Badge>
                          </TableCell>
                          <TableCell>{row.sourceStorageLocation ?? "-"}</TableCell>
                          <TableCell>{row.destinationStorageLocation ?? "-"}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="icon-sm"
                              className="rounded-full"
                              render={<Link href={`/inventory-management/transfers/details/${row.id}`} />}
                            >
                              <Pencil />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  page={shopPagination.page}
                  totalPages={shopPagination.totalPages}
                  totalEntries={shopPagination.totalEntries}
                  pageSize={shopPagination.limit}
                  loading={shopLoading}
                  onPageChange={(p) => loadShopTransfers(p, shopPagination.limit)}
                  pageSizeOptions={[30, 50, 100, 200]}
                  onPageSizeChange={(s) => loadShopTransfers(1, s)}
                />
              </>
            )}

            {activeTab === "supplier-specific" && (
              <>
                <div className="relative overflow-hidden rounded-t-lg">
                  <TableLoadingOverlay show={supplierLoading && supplierRows.length > 0} />
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50 h-12">
                        <TableHead className="h-12 font-semibold text-muted-foreground">Transfer ID</TableHead>
                        <TableHead className="h-12 font-semibold text-muted-foreground">Created At</TableHead>
                        <TableHead className="h-12 font-semibold text-muted-foreground">Supplier</TableHead>
                        <TableHead className="h-12 font-semibold text-muted-foreground">Status</TableHead>
                        <TableHead className="h-12 font-semibold text-muted-foreground">Type</TableHead>
                        <TableHead className="h-12 text-right font-semibold text-muted-foreground">Total Price</TableHead>
                        <TableHead className="h-12 text-center font-semibold text-muted-foreground">Number of Packages</TableHead>
                        <TableHead className="sticky right-0 z-10 h-12 w-40 bg-muted/50 text-center font-semibold text-muted-foreground">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="[&_td]:py-4.5">
                      {supplierLoading && supplierRows.length === 0 &&
                        Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={`sk-${i}`} className="border-b border-border">
                            {Array.from({ length: 8 }).map((__, j) => (
                              <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                            ))}
                          </TableRow>
                        ))}
                      {!supplierLoading && supplierRows.length === 0 && (
                        <TableRow className="border-b border-border">
                          <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                            No transfers found.
                          </TableCell>
                        </TableRow>
                      )}
                      {supplierRows.map((row) => (
                        <TableRow key={row.id} className="border-b border-border">
                          <TableCell>
                            <button className="text-primary hover:underline" onClick={() => openRow(row.id)}>
                              {row.advertisedId}
                            </button>
                          </TableCell>
                          <TableCell>{fmtDate(row.createdAt)}</TableCell>
                          <TableCell>{row.fromSupplier?.name || row.toSupplier?.name || "-"}</TableCell>
                          <TableCell>{row.isCompleted ? "Completed" : "In Route"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="rounded-md"
                              style={
                                row.transferType === "incoming"
                                  ? { backgroundColor: "#F5FCED", color: "var(--color-emerald-400)", borderColor: "currentColor" }
                                  : { backgroundColor: "#E6F7FF", color: "var(--color-sky-400)", borderColor: "currentColor" }
                              }
                            >
                              {row.transferType === "incoming" ? "Incoming" : "Outgoing"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">${(row.totalPrice || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-center">{row.numberOfPackages || 0}</TableCell>
                          <TableCell className="sticky right-0 z-10 w-40 bg-card text-center">
                            {!row.isTransit ? (
                              <AlertDialog>
                                <AlertDialogTrigger>
                                  <Button size="sm" disabled={markInTransitLoading[row.id]}>
                                    {markInTransitLoading[row.id] && <Loader2 className="size-3.5 animate-spin" />}
                                    Mark In Transit
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Completion</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to mark this transfer as In Transit?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>No</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleMarkInTransit(row.id)}>Yes</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <Button size="sm" render={<Link href={`/inventory-management/transfers/details/${row.id}`} />}>
                                {row.isCompleted ? "Completed" : "Manage"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  page={supplierPagination.page}
                  totalPages={supplierPagination.totalPages}
                  totalEntries={supplierPagination.totalEntries}
                  pageSize={supplierPagination.limit}
                  loading={supplierLoading}
                  onPageChange={(p) => loadSupplierTransfers(p, supplierPagination.limit)}
                  pageSizeOptions={[30, 50, 100, 200]}
                  onPageSizeChange={(s) => loadSupplierTransfers(1, s)}
                />
              </>
            )}
          </div>
        </div>

        {withinDetail && (
          <WithinLocationDetailPanel transfer={withinDetail} onClose={closeDetail} />
        )}
        {shopDetail && (
          <ShopTransferDetailPanel transfer={shopDetail} onClose={closeDetail} />
        )}
      </div>
    </div>
  );
}
