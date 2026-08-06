"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Clock, Pencil, Plus, Trash2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { usePermission } from "@/util/use-permission";
import { fetchShiftsList } from "@/services/employees/shift/list";
import { deleteShift } from "@/services/employees/shift/deleteShift";
import { approveShift } from "@/services/employees/shift/approve";
import { fetchMyLiveShift } from "@/services/employees/shift/myLiveShift";
import { fetchAccessControlledEmployees } from "@/services/employees/listAccessControlled";
import { fetchShopsData } from "@/services/shops/list";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LiveShiftControl from "./LiveShiftControl";
import ShiftFormDrawer from "./ShiftFormDrawer";
import TotalWorkHoursDrawer from "./TotalWorkHoursDrawer";
import DeleteShiftDrawer from "./DeleteShiftDrawer";

const DATE_FILTERS = ["All", "Today", "Yesterday", "Custom"] as const;
type DateFilter = (typeof DATE_FILTERS)[number];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtDateTime(date?: string, time?: string) {
  if (!date) return "-";
  const d = new Date(date);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${time ?? ""} ${d.toLocaleDateString()} (${weekday})`;
}

function hoursWorked(row: any) {
  if (row.totalHoursLogged == null) return "-";
  return `${row.totalHoursLogged}h ${row.totalMinutesLogged ?? 0}m`;
}

export default function EmployeeShiftPage() {
  const { shopId } = useShop();
  const { user } = usePermission();

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 30, total: 0, totalPages: 1 });
  const [liveShift, setLiveShift] = useState<any>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formShift, setFormShift] = useState<any>(null);

  const [hoursOpen, setHoursOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [filterShopId, setFilterShopId] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("All");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const isAccessControlled = user?.type === "ACCESS_CONTROLLED";

  useEffect(() => {
    fetchAccessControlledEmployees(100, 1).then((res) => setEmployees(res?.data?.employees ?? []));
    fetchShopsData().then((res) => setShops(res?.data ?? []));
  }, []);

  const load = useCallback(
    async (page = 1) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, unknown> = { shopId, page, limit: pagination.pageSize };
        if (employeeId) params.employeeId = employeeId;
        if (filterShopId) params.shopId = filterShopId;
        if (approvalStatus) params.isApproved = approvalStatus === "approved";

        if (dateFilter === "Today") {
          const today = toISODate(new Date());
          params.startDate = today;
          params.endDate = today;
        } else if (dateFilter === "Yesterday") {
          const y = toISODate(new Date(Date.now() - 86400000));
          params.startDate = y;
          params.endDate = y;
        } else if (dateFilter === "Custom" && customStartDate && customEndDate) {
          params.startDate = customStartDate;
          params.endDate = customEndDate;
        }

        const res = await fetchShiftsList(params);
        setRows(res?.data?.workShifts ?? []);
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
    [shopId, pagination.pageSize, employeeId, filterShopId, approvalStatus, dateFilter, customStartDate, customEndDate]
  );

  const refreshLiveShift = useCallback(() => {
    fetchMyLiveShift().then((res) => setLiveShift(res?.data?.shift ?? null));
  }, []);

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, employeeId, filterShopId, approvalStatus, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    refreshLiveShift();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const handleApprove = async (row: any) => {
    try {
      await approveShift(row.id, shopId as string);
      toast.success("Shift approved");
      load(pagination.current);
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve shift");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !shopId) return;
    setDeleteLoading(true);
    try {
      await deleteShift(deleteTarget.id, shopId as string);
      toast.success("Shift deleted successfully");
      setDeleteTarget(null);
      load(pagination.current);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete shift");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Access Management</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Employee Shift</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap gap-2">
          <LiveShiftControl liveShift={liveShift} onChanged={() => { refreshLiveShift(); load(pagination.current); }} />
          <Button variant="outline" onClick={() => setHoursOpen(true)}>
            <Clock className="size-4" />
            Total Work Hours
          </Button>
          <Button
            onClick={() => {
              setFormMode("add");
              setFormShift(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add Shift
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!isAccessControlled && (
          <Select
            items={[{ value: "", label: "Select Employees" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]}
            value={employeeId}
            onValueChange={(v) => setEmployeeId(v as string)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Select Employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          items={[{ value: "", label: "Select Shop" }, ...shops.map((s) => ({ value: s.id, label: s.name }))]}
          value={filterShopId}
          onValueChange={(v) => setFilterShopId(v as string)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Select Shop" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Select Shop</SelectItem>
            {shops.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={[
            { value: "", label: "Approval Status" },
            { value: "approved", label: "Approved" },
            { value: "pending", label: "Not Approved" },
          ]}
          value={approvalStatus}
          onValueChange={(v) => setApprovalStatus(v as string)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Approval Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Approval Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Not Approved</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {DATE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setDateFilter(f)}
              className={`rounded-[7px] px-3 py-1.5 text-sm font-medium transition-colors ${
                dateFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-background/60"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {dateFilter === "Custom" && (
          <>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
            />
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
            />
          </>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && rows.length > 0} />
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Name</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Clock In</TableHead>
              <TableHead>Clock Out</TableHead>
              <TableHead>Hours Worked</TableHead>
              <TableHead className="text-center">Approved</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              rows.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
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
                  No shifts found.
                </TableCell>
              </TableRow>
            )}

            {rows.map((row, i) => (
              <TableRow
                key={row.id}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
              >
                <TableCell>{row.employee?.name ?? "-"}</TableCell>
                <TableCell>{row.storeInfo?.name ?? "-"}</TableCell>
                <TableCell>{fmtDateTime(row.startDate, row.startTimeTwelveHours)}</TableCell>
                <TableCell>{fmtDateTime(row.endDate, row.endTimeTwelveHours)}</TableCell>
                <TableCell>{hoursWorked(row)}</TableCell>
                <TableCell className="text-center">
                  {row.isApproved ? (
                    <Badge variant="default">Approved</Badge>
                  ) : user?.type !== "ACCESS_CONTROLLED" ? (
                    <Button size="sm" variant="outline" onClick={() => handleApprove(row)}>
                      Approve
                    </Button>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                      Actions <ChevronDown className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        className="gap-2 whitespace-nowrap"
                        onClick={() => {
                          setFormMode("edit");
                          setFormShift(row);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4 text-sky-600" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 whitespace-nowrap" variant="destructive" onClick={() => setDeleteTarget(row)}>
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
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
      />

      <ShiftFormDrawer
        open={formOpen}
        mode={formMode}
        initialShift={formShift}
        onClose={() => setFormOpen(false)}
        onSaved={() => load(pagination.current)}
      />

      <TotalWorkHoursDrawer open={hoursOpen} onClose={() => setHoursOpen(false)} />

      <DeleteShiftDrawer shift={deleteTarget} loading={deleteLoading} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
    </div>
  );
}
