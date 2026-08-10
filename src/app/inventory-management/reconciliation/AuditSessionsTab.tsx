"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchAuditSessions } from "@/services/auditSessions/list";
import { fetchEmployeesList } from "@/services/employees/list";
import { fetchStorageLocations } from "@/services/storageLocations/list";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AuditSessionDetailDrawer from "./AuditSessionDetailDrawer";
import { useSettings } from "@/context/settings-context";

const PAGE_SIZE_OPTIONS = [30, 50, 100, 200];

export default function AuditSessionsTab() {
  const { defaultPageSize } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { shopId } = useShop();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const openSessionId = searchParams.get("adjustmentId");

  const loadSessions = useCallback(
    async (targetPage = 1, employeeId = employeeFilter, storageLocationId = locationFilter, size = pageSize) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = { limit: size, page: targetPage };
        if (employeeId) params.employeeId = employeeId;
        if (storageLocationId) params.storageLocationId = storageLocationId;
        const res = await fetchAuditSessions(shopId, params);
        setRows(res?.data?.sessions ?? []);
        setPage(res?.data?.paginationData?.currentPage ?? targetPage);
        setTotalPages(res?.data?.paginationData?.totalPages ?? 1);
        setTotalEntries(res?.data?.paginationData?.totalEntries ?? 0);
      } catch (err) {
        toast.error(err?.message || "Failed to fetch audit sessions");
      } finally {
        setLoading(false);
      }
    },
    [shopId, employeeFilter, locationFilter, pageSize]
  );

  useEffect(() => {
    if (!shopId) return;
    fetchEmployeesList()
      .then((res) => setEmployeeOptions(res?.data?.employees ?? []))
      .catch(() => {});
    fetchStorageLocations(shopId)
      .then((res) => setLocationOptions(res?.data?.data?.locations ?? []))
      .catch(() => {});
  }, [shopId]);

  useEffect(() => {
    loadSessions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const openSession = (id: string | number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("adjustmentId", String(id));
    router.push(`${pathname}?${params.toString()}`);
  };

  const closeSession = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("adjustmentId");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={employeeFilter}
          onValueChange={(v) => {
            setEmployeeFilter(v);
            loadSessions(1, v, locationFilter);
          }}
        >
          <SelectTrigger className="w-55">
            <SelectValue placeholder="Filter by Employee" />
          </SelectTrigger>
          <SelectContent>
            {employeeOptions.map((emp: any) => (
              <SelectItem key={emp.id} value={String(emp.id)}>
                {emp.name || emp.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={locationFilter}
          onValueChange={(v) => {
            setLocationFilter(v);
            loadSessions(1, employeeFilter, v);
          }}
        >
          <SelectTrigger className="w-55">
            <SelectValue placeholder="Filter by Storage Location" />
          </SelectTrigger>
          <SelectContent>
            {locationOptions.map((loc: any) => (
              <SelectItem key={loc.id} value={String(loc.id)}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button className="ml-auto" onClick={() => router.push("/inventory-management/reconciliation/sessions/new")}>
          <Plus /> Start Session
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && rows.length > 0} />
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Storage Location</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Started At</TableHead>
              <TableHead>Ended At</TableHead>
              <TableHead className="text-center">Approved</TableHead>
              <TableHead className="text-center">Rejected</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              rows.length === 0 &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && rows.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No audit sessions found.
                </TableCell>
              </TableRow>
            )}

            {rows.length > 0 &&
              rows.map((row: any, i) => (
                <TableRow
                  key={row.id}
                  className={`cursor-pointer border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                  onClick={() => openSession(row.id)}
                >
                  <TableCell>{row.storageLocation?.name || "-"}</TableCell>
                  <TableCell>{row.employee?.name || row.employee?.email || "-"}</TableCell>
                  <TableCell>{row.startedAtDate ? new Date(row.startedAtDate).toLocaleString() : "-"}</TableCell>
                  <TableCell>{row.endedAtDate ? new Date(row.endedAtDate).toLocaleString() : "-"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{row.approvedCount ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="destructive">{row.rejectedCount ?? 0}</Badge>
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
        pageSize={pageSize}
        loading={loading}
        onPageChange={(p) => loadSessions(p)}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={(s) => {
          setPageSize(s);
          loadSessions(1, employeeFilter, locationFilter, s);
        }}
      />

      <AuditSessionDetailDrawer
        sessionId={openSessionId}
        onClose={closeSession}
        onChanged={() => loadSessions(page)}
      />
    </div>
  );
}
