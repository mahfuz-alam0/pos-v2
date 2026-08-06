"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchDeliveryJobsList } from "@/services/deliveryJobs/list";
import { removeDeliveryJob } from "@/services/deliveryJobs/remove";
import { retryDeliveryJobMetrcReporting } from "@/services/deliveryJobs/retryMetrcReporting";
import { changeDeliveryJobStatus } from "@/services/deliveryJobs/changeStatus";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import JobDetailsPanel from "./JobDetailsPanel";
import JobFormDrawer from "./JobFormDrawer";
import StatusChangeDrawer from "./StatusChangeDrawer";

const PAGE_SIZE = 30;

const STATUS_OPTIONS = [
  { value: "__all__", label: "All" },
  { value: "WAITING_TO_START", label: "Waiting to Start" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "DISMISSED", label: "Dismissed" },
];

const METRC_STATUS_OPTIONS = [
  { value: "__all__", label: "All" },
  { value: "PENDING", label: "PENDING" },
  { value: "SUCCESS", label: "SUCCESS" },
  { value: "FAILED", label: "FAILED" },
];

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  WAITING_TO_START: "outline",
  IN_PROGRESS: "secondary",
  COMPLETED: "default",
  FAILED: "destructive",
  DISMISSED: "outline",
};

const TERMINAL_STATUSES = ["COMPLETED", "DISMISSED", "FAILED"];

interface JobRow {
  id: string | number;
  advertisedSaleId: string;
  status: string;
  driverInfo: { name: string; phone?: string } | null;
  vehicleInfo: { name: string; make?: string; model?: string; licensePlateData?: string } | null;
  createdAt: string;
  metrcReportingStatus: string | null;
}

function formatDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
}

export default function JobsTable() {
  const { shopId } = useShop();
  const isCaliforniaState = typeof window !== "undefined" && localStorage.getItem("isCaliforniaState") === "true";

  const [statusFilter, setStatusFilter] = useState("__all__");
  const [driverIdFilter, setDriverIdFilter] = useState("");
  const [saleIdFilter, setSaleIdFilter] = useState("");
  const [metrcStatusFilter, setMetrcStatusFilter] = useState("__all__");

  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, totalEntries: 0, totalPages: 0 });

  const [detailId, setDetailId] = useState<string | number | null>(null);
  const [editJobId, setEditJobId] = useState<string | number | null>(null);
  const [statusDrawer, setStatusDrawer] = useState<{ action: "start" | "complete"; job: JobRow } | null>(null);
  const [retryingMetrcIds, setRetryingMetrcIds] = useState<Set<string | number>>(new Set());

  const [dismissTarget, setDismissTarget] = useState<JobRow | null>(null);
  const [dismissLoading, setDismissLoading] = useState(false);
  const [failTarget, setFailTarget] = useState<JobRow | null>(null);
  const [failLoading, setFailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JobRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadJobs = useCallback(
    async (page = 1, status = "__all__", driverId = "", advertisedSaleId = "", metrcStatus = "__all__") => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = { page, limit: PAGE_SIZE };
        if (status !== "__all__") params.status = status;
        if (driverId) params.driverId = driverId;
        if (advertisedSaleId) params.advertisedSaleId = advertisedSaleId;
        if (metrcStatus !== "__all__") params.metrcReportingStatus = metrcStatus;
        const res = await fetchDeliveryJobsList(shopId, params);
        setRows(res?.data ?? []);
        const p = res?.paginationData;
        if (p) {
          setPagination({ page: p.currentPage ?? page, limit: p.limit ?? PAGE_SIZE, totalEntries: p.totalEntries ?? 0, totalPages: p.totalPages ?? 0 });
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load delivery jobs");
      } finally {
        setLoading(false);
      }
    },
    [shopId]
  );

  useEffect(() => {
    loadJobs(1, statusFilter, driverIdFilter, saleIdFilter, metrcStatusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const refresh = () => loadJobs(pagination.page, statusFilter, driverIdFilter, saleIdFilter, metrcStatusFilter);

  const handleSearch = () => loadJobs(1, statusFilter, driverIdFilter, saleIdFilter, metrcStatusFilter);

  const handleReset = () => {
    setStatusFilter("__all__");
    setDriverIdFilter("");
    setSaleIdFilter("");
    setMetrcStatusFilter("__all__");
    loadJobs(1, "__all__", "", "", "__all__");
  };

  const handleRetryMetrc = async (id: string | number) => {
    if (!shopId) return;
    setRetryingMetrcIds((prev) => new Set(prev).add(id));
    try {
      await retryDeliveryJobMetrcReporting({ shopId, id });
      toast.success("METRC reporting retried successfully");
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to retry METRC reporting");
    } finally {
      setRetryingMetrcIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDismiss = async () => {
    if (!dismissTarget || !shopId) return;
    setDismissLoading(true);
    try {
      await changeDeliveryJobStatus(dismissTarget.id, { shopId, status: "DISMISSED" });
      toast.success("Delivery job dismissed successfully");
      setDismissTarget(null);
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to dismiss delivery job");
    } finally {
      setDismissLoading(false);
    }
  };

  const handleMarkAsFailed = async () => {
    if (!failTarget || !shopId) return;
    setFailLoading(true);
    try {
      await changeDeliveryJobStatus(failTarget.id, { shopId, status: "FAILED" });
      toast.success("Delivery job marked as failed");
      setFailTarget(null);
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update delivery job status");
    } finally {
      setFailLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !shopId) return;
    setDeleteLoading(true);
    try {
      await removeDeliveryJob(deleteTarget.id, shopId);
      toast.success("Delivery job deleted successfully");
      setDeleteTarget(null);
      if (String(detailId) === String(deleteTarget.id)) setDetailId(null);
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete delivery job");
    } finally {
      setDeleteLoading(false);
    }
  };

  const metrcBadgeVariant = (status: string | null) => {
    if (status === "SUCCESS") return "default";
    if (status === "PENDING") return "secondary";
    if (status === "FAILED") return "destructive";
    return "outline";
  };

  return (
    <div className="flex gap-4 p-6">
      <div className={detailId ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Delivery Management</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Delivery Jobs</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Status</p>
            <Select items={STATUS_OPTIONS} value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-1 text-xs text-muted-foreground">Driver ID</p>
            <Input
              className="w-44"
              placeholder="Enter driver ID"
              value={driverIdFilter}
              onChange={(e) => setDriverIdFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-muted-foreground">Sale ID</p>
            <Input
              className="w-44"
              placeholder="Enter sale ID"
              value={saleIdFilter}
              onChange={(e) => setSaleIdFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>

          {isCaliforniaState && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">METRC Status</p>
              <Select items={METRC_STATUS_OPTIONS} value={metrcStatusFilter} onValueChange={setMetrcStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRC_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={handleSearch}>Search</Button>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Sale ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Created</TableHead>
                {isCaliforniaState && <TableHead className="text-center">Reporting Status</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                rows.length === 0 &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-b-0">
                    {Array.from({ length: isCaliforniaState ? 7 : 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={isCaliforniaState ? 7 : 6} className="py-10 text-center text-muted-foreground">
                    No delivery jobs found.
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row, i) => {
                const isTerminal = TERMINAL_STATUSES.includes(row.status);
                const isRetrying = retryingMetrcIds.has(row.id);
                return (
                  <TableRow
                    key={row.id}
                    data-active={detailId === row.id}
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] data-[active=true]:bg-muted/40 ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                  >
                    <TableCell className="font-mono text-xs">
                      <button onClick={() => setDetailId(row.id)} className="cursor-pointer text-left text-primary hover:underline">
                        {row.advertisedSaleId || "-"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[row.status] || "outline"}>{row.status?.replace(/_/g, " ") || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      {row.driverInfo ? (
                        <div>
                          <p className="text-sm font-medium">{row.driverInfo.name}</p>
                          <p className="text-xs text-muted-foreground">{row.driverInfo.phone}</p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {row.vehicleInfo ? (
                        <div>
                          <p className="text-sm font-medium">{row.vehicleInfo.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[row.vehicleInfo.make, row.vehicleInfo.model, row.vehicleInfo.licensePlateData].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
                    {isCaliforniaState && (
                      <TableCell className="text-center">
                        <Badge
                          variant={metrcBadgeVariant(row.metrcReportingStatus)}
                          className={row.metrcReportingStatus !== "SUCCESS" ? "cursor-pointer" : ""}
                          onClick={() => !isRetrying && row.metrcReportingStatus !== "SUCCESS" && handleRetryMetrc(row.id)}
                        >
                          {isRetrying && <Loader2 className="mr-1 size-3 animate-spin" />}
                          {row.metrcReportingStatus || "N/A"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="outline" size="sm" disabled={row.status === "FAILED"}>
                              Actions <ChevronDown className="size-3.5" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled={isTerminal} onClick={() => setEditJobId(row.id)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={["IN_PROGRESS", ...TERMINAL_STATUSES].includes(row.status)}
                            onClick={() => setStatusDrawer({ action: "start", job: row })}
                          >
                            Start
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={isTerminal} onClick={() => setStatusDrawer({ action: "complete", job: row })}>
                            Complete
                          </DropdownMenuItem>
                          <DropdownMenuItem variant={isTerminal ? "default" : "destructive"} disabled={isTerminal} onClick={() => setDismissTarget(row)}>
                            Dismiss
                          </DropdownMenuItem>
                          <DropdownMenuItem variant={isTerminal ? "default" : "destructive"} disabled={isTerminal} onClick={() => setFailTarget(row)}>
                            Mark as Failed
                          </DropdownMenuItem>
                          {["DISMISSED", "COMPLETED"].includes(row.status) && (
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(row)}>
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {pagination.totalEntries > 0 && (
          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalEntries={pagination.totalEntries}
            pageSize={pagination.limit}
            loading={loading}
            onPageChange={(p: number) => loadJobs(p, statusFilter, driverIdFilter, saleIdFilter, metrcStatusFilter)}
          />
        )}
      </div>

      {detailId && <JobDetailsPanel jobId={detailId} onClose={() => setDetailId(null)} />}

      <JobFormDrawer
        open={!!editJobId}
        jobId={editJobId}
        onClose={() => setEditJobId(null)}
        onSaved={() => {
          setEditJobId(null);
          refresh();
        }}
      />

      <StatusChangeDrawer
        open={!!statusDrawer}
        action={statusDrawer?.action ?? null}
        jobId={statusDrawer?.job.id ?? null}
        advertisedSaleId={statusDrawer?.job.advertisedSaleId ?? null}
        onClose={() => setStatusDrawer(null)}
        onSaved={() => {
          setStatusDrawer(null);
          refresh();
        }}
      />

      <AlertDialog open={!!dismissTarget} onOpenChange={(open) => !open && !dismissLoading && setDismissTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss Delivery Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to dismiss this delivery job? The status will be changed to <strong>DISMISSED</strong>. You can delete it afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={dismissLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDismiss} disabled={dismissLoading}>
              {dismissLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Yes, Dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!failTarget} onOpenChange={(open) => !open && !failLoading && setFailTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Failed</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this delivery job as <strong>FAILED</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={failLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleMarkAsFailed} disabled={failLoading}>
              {failLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Yes, Mark as Failed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this delivery job? This action <strong>cannot be undone</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
