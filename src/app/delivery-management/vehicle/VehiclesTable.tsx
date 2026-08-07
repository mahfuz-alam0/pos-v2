"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { fetchVehiclesList } from "@/services/vehicles/list";
import { removeVehicle } from "@/services/vehicles/remove";
import { useShop } from "@/context/shop-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

import VehicleFormDrawer from "./VehicleFormDrawer";
import VehicleDetailsPanel from "./VehicleDetailsPanel";
import ReportToMetrcDrawer from "./ReportToMetrcDrawer";

const PAGE_SIZE = 30;

interface VehicleRow {
  id: string;
  name: string;
  model: string;
  make: string;
  licensePlateData: string;
  metrcReportingStatus: string | null;
}

const ACTIVE_OPTIONS = [
  { value: "__all__", label: "All" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const METRC_STATUS_OPTIONS = [
  { value: "__all__", label: "All" },
  { value: "PENDING", label: "PENDING" },
  { value: "SUCCESS", label: "SUCCESS" },
  { value: "FAILED", label: "FAILED" },
];

export default function VehiclesTable() {
  const { shopId } = useShop();
  const isCaliforniaState = typeof window !== "undefined" && localStorage.getItem("isCaliforniaState") === "true";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [isActiveFilter, setIsActiveFilter] = useState("__all__");
  const [metrcStatusFilter, setMetrcStatusFilter] = useState("__all__");

  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, totalEntries: 0, totalPages: 0 });

  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; vehicleId: string | number | null }>({
    open: false,
    mode: "add",
    vehicleId: null,
  });
  const [detailId, setDetailId] = useState<string | number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [metrcVehicleId, setMetrcVehicleId] = useState<string | number | null>(null);

  const loadVehicles = useCallback(
    async (page = 1, searchTerm = "", activeFilter = "__all__", metrcStatus = "__all__") => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = { page, limit: PAGE_SIZE };
        if (searchTerm) params.search = searchTerm;
        if (activeFilter !== "__all__") params.isActive = activeFilter;
        if (metrcStatus !== "__all__") params.metrcReportingStatus = metrcStatus;
        const res = await fetchVehiclesList(shopId, params);
        setRows(
          (res?.data ?? []).map((v: any) => ({
            id: v.id,
            name: v.name,
            model: v.model ?? "n/a",
            make: v.make ?? "n/a",
            licensePlateData: v.licensePlateData ?? "n/a",
            metrcReportingStatus: v.metrcReportingStatus ?? null,
          }))
        );
        const p = res?.paginationData;
        if (p) {
          setPagination({ page: p.currentPage ?? page, limit: p.limit ?? PAGE_SIZE, totalEntries: p.totalEntries ?? 0, totalPages: p.totalPages ?? 0 });
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load vehicles");
      } finally {
        setLoading(false);
      }
    },
    [shopId]
  );

  useEffect(() => {
    loadVehicles(1, debouncedSearch, isActiveFilter, metrcStatusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadVehicles, debouncedSearch, isActiveFilter, metrcStatusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget || !shopId) return;
    setDeleteLoading(true);
    try {
      await removeVehicle(deleteTarget.id, shopId);
      toast.success("Vehicle deleted successfully");
      setDeleteTarget(null);
      if (String(detailId) === String(deleteTarget.id)) setDetailId(null);
      loadVehicles(pagination.page, debouncedSearch, isActiveFilter, metrcStatusFilter);
    } catch (err: any) {
      toast.error(err?.message || `Failed to delete ${deleteTarget.name}`);
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
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Delivery Management</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Vehicle</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button onClick={() => setDrawer({ open: true, mode: "add", vehicleId: null })}>
            <Plus /> Add Delivery Vehicle
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>

          <Select items={ACTIVE_OPTIONS} value={isActiveFilter} onValueChange={setIsActiveFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isCaliforniaState && (
            <div className="flex items-center gap-2">
              <span className="text-sm whitespace-nowrap text-muted-foreground">METRC Status</span>
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
        </div>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Vehicle Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Make</TableHead>
                {isCaliforniaState && <TableHead className="text-center">METRC Status</TableHead>}
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                rows.length === 0 &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-b-0">
                    {Array.from({ length: isCaliforniaState ? 6 : 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={isCaliforniaState ? 6 : 5} className="py-10 text-center text-muted-foreground">
                    No vehicles found.
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  data-active={detailId === row.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] data-[active=true]:bg-muted/40 ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                >
                  <TableCell className="font-medium">
                    <button onClick={() => setDetailId(row.id)} className="cursor-pointer text-left text-primary hover:underline">
                      {row.name}
                    </button>
                  </TableCell>
                  <TableCell>{row.model}</TableCell>
                  <TableCell>{row.licensePlateData}</TableCell>
                  <TableCell>{row.make}</TableCell>
                  {isCaliforniaState && (
                    <TableCell className="text-center">
                      <Badge
                        variant={metrcBadgeVariant(row.metrcReportingStatus)}
                        className={row.metrcReportingStatus !== "SUCCESS" ? "cursor-pointer" : ""}
                        onClick={() => row.metrcReportingStatus !== "SUCCESS" && setMetrcVehicleId(row.id)}
                      >
                        {row.metrcReportingStatus || "Report to METRC"}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="icon-sm" onClick={() => setDrawer({ open: true, mode: "edit", vehicleId: row.id })}>
                        <Pencil />
                      </Button>
                      <Button variant="outline" size="icon-sm" onClick={() => setDeleteTarget(row)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
            onPageChange={(p: number) => loadVehicles(p, debouncedSearch, isActiveFilter, metrcStatusFilter)}
          />
        )}
      </div>

      {detailId && (
        <VehicleDetailsPanel
          vehicleId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={() => setDrawer({ open: true, mode: "edit", vehicleId: detailId })}
        />
      )}

      <VehicleFormDrawer
        open={drawer.open}
        mode={drawer.mode}
        vehicleId={drawer.vehicleId}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={(savedId) => {
          setDrawer((prev) => ({ ...prev, open: false }));
          loadVehicles(pagination.page, debouncedSearch, isActiveFilter, metrcStatusFilter);
          if (isCaliforniaState && savedId) setMetrcVehicleId(savedId);
        }}
      />

      <ReportToMetrcDrawer
        open={!!metrcVehicleId}
        vehicleId={metrcVehicleId}
        onClose={() => setMetrcVehicleId(null)}
        onReported={() => {
          setMetrcVehicleId(null);
          loadVehicles(pagination.page, debouncedSearch, isActiveFilter, metrcStatusFilter);
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to delete <strong>{deleteTarget?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
