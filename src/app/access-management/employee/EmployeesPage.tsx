"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { usePermission } from "@/util/use-permission";
import { fetchEmployeesList } from "@/services/employees/list";
import { deleteEmployee } from "@/services/employees/delete";
import { lockEmployee, unlockEmployee } from "@/services/employees/lockUnlock";
import { rotateEmployeePassword } from "@/services/employees/resetPassword";
import { fetchMyLiveShift } from "@/services/employees/shift/myLiveShift";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Drawer from "@/components/ui/Drawer";
import { Field } from "@/components/admin/form-fields";
import EmployeeDetailPanel from "./EmployeeDetailPanel";
import DeleteEmployeeDrawer from "./DeleteEmployeeDrawer";
import EmployeeFormDrawer from "./EmployeeFormDrawer";
import { useSettings } from "@/context/settings-context";

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRATION: "Administration",
  ACCESS_CONTROLLED: "Access Controlled",
  SUPER_ADMIN: "Super Admin",
};

function formatRole(type?: string) {
  if (!type) return "-";
  return ROLE_LABELS[type] ?? type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, " ");
}

function formatPhone(phone?: string) {
  if (!phone) return "-";
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return phone;
  return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function EmployeesPage() {
  const { defaultPageSize } = useSettings();
  const { shopId } = useShop();
  const { user } = usePermission();

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: defaultPageSize, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [liveShift, setLiveShift] = useState<any>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const [resetTarget, setResetTarget] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(
    async (page = 1, size = pagination.pageSize) => {
      setLoading(true);
      try {
        const res = await fetchEmployeesList({ page, limit: size, search });
        setRows(res?.data?.employees ?? []);
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
    [pagination.pageSize, search]
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, search]);

  useEffect(() => {
    fetchMyLiveShift().then((res) => setLiveShift(res?.data?.shift ?? null));
  }, []);

  useEffect(() => {
    if (user?.type === "ACCESS_CONTROLLED") return;
    fetchEmployeesList({ limit: 1000 }).then((res) => setEmployeeOptions(res?.data?.employees ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.type]);

  const canManage = (row: any) => {
    if (!user) return false;
    if (user.type === "ACCESS_CONTROLLED") return false;
    if (user.type === "ADMINISTRATION" && (row.type === "ADMINISTRATION" || row.type === "SUPER_ADMIN")) return false;
    return true;
  };

  const handleToggleLock = async (row: any) => {
    try {
      if (row.isLocked) {
        await unlockEmployee(row.id);
        toast.success("Employee unlocked");
      } else {
        await lockEmployee(row.id);
        toast.success("Employee locked");
      }
      load(pagination.current);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update lock status");
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !newPassword.trim()) {
      toast.error("Please enter a new password");
      return;
    }
    setResetting(true);
    try {
      await rotateEmployeePassword(resetTarget.id, newPassword);
      toast.success("Password reset successfully");
      setResetTarget(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteEmployee(deleteTarget.id);
      toast.success("Employee deleted successfully");
      setDeleteTarget(null);
      load(pagination.current);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete employee");
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
              <BreadcrumbPage>Team</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add Employee
        </Button>
      </div>

      {user?.type !== "ACCESS_CONTROLLED" && (
        <Select
          value={employeeFilter || "__all__"}
          onValueChange={(v) => {
            setEmployeeFilter(v === "__all__" ? "" : v);
            const emp = employeeOptions.find((e: any) => String(e.id) === v);
            setSearch(emp?.name ?? "");
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select Employee">
              {employeeFilter ? employeeOptions.find((e: any) => String(e.id) === employeeFilter)?.name : "All Employees"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Employees</SelectItem>
            {employeeOptions.map((emp: any) => (
              <SelectItem key={emp.id} value={String(emp.id)}>
                {emp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex gap-4">
      <div className={selectedId ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Employee Name</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Phone No.</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Lock Status</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="sticky right-0 z-10 w-33 bg-muted text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.35)]">Action</TableHead>
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
                    No employees found.
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                >
                  <TableCell>
                    <button className="text-primary hover:underline" onClick={() => setSelectedId(row.id)}>
                      {row.name}
                    </button>
                  </TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{formatPhone(row.phone)}</TableCell>
                  <TableCell>
                    <Badge variant={row.type === "ADMINISTRATION" ? "default" : "secondary"}>{formatRole(row.type)}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={!row.isLocked} onCheckedChange={() => handleToggleLock(row)} disabled={!canManage(row)} />
                  </TableCell>
                  <TableCell className="text-center">
                    {row.id === liveShift?.employeeId ? <Badge variant="default">Active</Badge> : "-"}
                  </TableCell>
                  <TableCell
                    className={`sticky right-0 z-10 w-33 text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.35)] ${i % 2 === 1 ? "bg-table-zebra" : "bg-background"}`}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="outline" size="sm" disabled={!canManage(row)} />}>
                        Actions <ChevronDown className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="gap-2 whitespace-nowrap" onClick={() => setResetTarget(row)}>
                          <KeyRound className="size-4 text-blue-500" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 whitespace-nowrap"
                          onClick={() => setEditTarget(row)}
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
          pageSizeOptions={[30, 50, 100, 200]}
          onPageSizeChange={(s) => {
            setPagination((prev) => ({ ...prev, pageSize: s, current: 1 }));
            load(1, s);
          }}
        />
      </div>

      {selectedId && (
        <div className="w-1/3">
          <EmployeeDetailPanel employeeId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      )}
      </div>

      <Drawer open={!!resetTarget} onClose={resetting ? undefined : () => setResetTarget(null)} side="right" size={400}>
        <div className="flex h-full flex-col">
          <div className="px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
            <div className="text-base font-semibold">Reset Password</div>
            <div className="text-xs text-muted-foreground">{resetTarget?.name}</div>
          </div>
          <div className="flex-1 px-5 py-4">
            <Field label="New Password" required>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
            <Button variant="outline" onClick={() => setResetTarget(null)} disabled={resetting}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resetting}>
              {resetting ? "Saving..." : "Reset Password"}
            </Button>
          </div>
        </div>
      </Drawer>

      <DeleteEmployeeDrawer employee={deleteTarget} loading={deleteLoading} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />

      <EmployeeFormDrawer open={addOpen} mode="add" employeeId={null} onClose={() => setAddOpen(false)} onSaved={() => load(pagination.current)} />

      <EmployeeFormDrawer
        open={!!editTarget}
        mode="edit"
        employeeId={editTarget?.id ?? null}
        onClose={() => setEditTarget(null)}
        onSaved={() => load(pagination.current)}
      />
    </div>
  );
}
