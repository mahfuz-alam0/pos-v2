"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { fetchDriversList } from "@/services/drivers/list";
import { fetchDriverFilters } from "@/services/drivers/getFilters";
import { removeDriver } from "@/services/drivers/remove";
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

import DriverFormDrawer from "./DriverFormDrawer";
import DriverDetailsPanel from "./DriverDetailsPanel";
import ReportToMetrcDrawer from "./ReportToMetrcDrawer";

const PAGE_SIZE = 30;

interface DriverRow {
  id: string;
  name: string;
  license: string;
  email: string;
  phone: string;
  metrcReportingStatus: string | null;
}

interface FilterOption {
  queryFieldName: string;
  displayName: string;
}

const METRC_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "PENDING" },
  { value: "SUCCESS", label: "SUCCESS" },
  { value: "FAILED", label: "FAILED" },
];

export default function DriversTable() {
  const { shopId } = useShop();
  const isCaliforniaState = typeof window !== "undefined" && localStorage.getItem("isCaliforniaState") === "true";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("");
  const [metrcStatusFilter, setMetrcStatusFilter] = useState<string>("all");

  const [rows, setRows] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, totalEntries: 0, totalPages: 0 });

  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; driverId: string | number | null }>({
    open: false,
    mode: "add",
    driverId: null,
  });
  const [detailId, setDetailId] = useState<string | number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriverRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [metrcDriverId, setMetrcDriverId] = useState<string | number | null>(null);

  useEffect(() => {
    fetchDriverFilters().then((res) => {
      const filters = res?.data ?? [];
      setFilterOptions(filters);
      if (filters.length) setSelectedFilter(filters[0].queryFieldName);
    });
  }, []);

  const loadDrivers = useCallback(
    async (page = 1, searchTerm = "", filterField = "", metrcStatus = "all") => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = { page, limit: PAGE_SIZE };
        if (searchTerm && filterField) {
          params.searchFieldName = filterField;
          params.searchFiledValue = searchTerm;
        }
        if (metrcStatus !== "all") params.metrcReportingStatus = metrcStatus;
        const res = await fetchDriversList(shopId, params);
        setRows(
          (res?.data ?? []).map((d: any) => ({
            id: d.id,
            name: d.name,
            license: d.license ?? "n/a",
            email: d.email ?? "n/a",
            phone: d.phone ?? "n/a",
            metrcReportingStatus: d.metrcReportingStatus ?? null,
          }))
        );
        const p = res?.paginationData;
        if (p) {
          setPagination({ page: p.currentPage ?? page, limit: p.limit ?? PAGE_SIZE, totalEntries: p.totalEntries ?? 0, totalPages: p.totalPages ?? 0 });
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load drivers");
      } finally {
        setLoading(false);
      }
    },
    [shopId]
  );

  useEffect(() => {
    loadDrivers(1, debouncedSearch, selectedFilter, metrcStatusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDrivers, debouncedSearch, selectedFilter, metrcStatusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeDriver(deleteTarget.id);
      toast.success("Driver Deleted Successfully");
      setDeleteTarget(null);
      if (String(detailId) === String(deleteTarget.id)) setDetailId(null);
      loadDrivers(pagination.page, debouncedSearch, selectedFilter, metrcStatusFilter);
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
                <BreadcrumbPage>Drivers</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button onClick={() => setDrawer({ open: true, mode: "add", driverId: null })}>
            <Plus /> Add Delivery Person
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {filterOptions.length > 0 && (
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((opt) => (
                  <SelectItem key={opt.queryFieldName} value={opt.queryFieldName}>
                    {opt.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>

          {isCaliforniaState && (
            <div className="flex items-center gap-2">
              <span className="text-sm whitespace-nowrap text-muted-foreground">METRC Status</span>
              <Select value={metrcStatusFilter} onValueChange={setMetrcStatusFilter}>
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
                <TableHead>Driver Name</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
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
                    No drivers found.
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
                  <TableCell>{row.license}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.phone}</TableCell>
                  {isCaliforniaState && (
                    <TableCell className="text-center">
                      <Badge
                        variant={metrcBadgeVariant(row.metrcReportingStatus)}
                        className={row.metrcReportingStatus !== "SUCCESS" ? "cursor-pointer" : ""}
                        onClick={() => row.metrcReportingStatus !== "SUCCESS" && setMetrcDriverId(row.id)}
                      >
                        {row.metrcReportingStatus || "Report to METRC"}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="icon-sm" onClick={() => setDrawer({ open: true, mode: "edit", driverId: row.id })}>
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
            onPageChange={(p: number) => loadDrivers(p, debouncedSearch, selectedFilter, metrcStatusFilter)}
          />
        )}
      </div>

      {detailId && (
        <DriverDetailsPanel
          driverId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={() => setDrawer({ open: true, mode: "edit", driverId: detailId })}
        />
      )}

      <DriverFormDrawer
        open={drawer.open}
        mode={drawer.mode}
        driverId={drawer.driverId}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={(savedId) => {
          setDrawer((prev) => ({ ...prev, open: false }));
          loadDrivers(pagination.page, debouncedSearch, selectedFilter, metrcStatusFilter);
          if (isCaliforniaState && savedId) setMetrcDriverId(savedId);
        }}
      />

      <ReportToMetrcDrawer
        open={!!metrcDriverId}
        driverId={metrcDriverId}
        onClose={() => setMetrcDriverId(null)}
        onReported={() => {
          setMetrcDriverId(null);
          loadDrivers(pagination.page, debouncedSearch, selectedFilter, metrcStatusFilter);
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
