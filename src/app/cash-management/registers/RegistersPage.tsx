"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Settings, Power, Pencil, Trash2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchRegistersList } from "@/services/registers/list";
import { fetchSingleRegister } from "@/services/registers/getSingleRegister";
import { deleteRegister } from "@/services/registers/deleteRegister";
import { enableRegister, disableRegister } from "@/services/registers/toggleRegister";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import RegisterDetailsPanel from "./RegisterDetailsPanel";
import ManageHardwareDialog from "./ManageHardwareDialog";
import DeleteRegisterDrawer from "./DeleteRegisterDrawer";
import RegisterFormDrawer from "./RegisterFormDrawer";
import { useSettings } from "@/context/settings-context";

interface RegisterRow {
  id: string;
  name: string;
  isOpen: boolean;
  version: number;
}

export default function RegistersPage() {
  const { defaultPageSize } = useSettings();
  const { shopId } = useShop();

  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: defaultPageSize, total: 0, totalPages: 1 });

  const [selectedRegister, setSelectedRegister] = useState<any>(null);

  const [deleteTarget, setDeleteTarget] = useState<RegisterRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [hardwareRegister, setHardwareRegister] = useState<{ id: string; name: string } | null>(null);
  const [hardwareOpen, setHardwareOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formRegisterId, setFormRegisterId] = useState<string | null>(null);

  const loadRegisters = useCallback(
    async (page = 1, size = pagination.pageSize) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const res = await fetchRegistersList(shopId as string, { page, limit: size });
        const registers = res?.data?.data?.registers ?? [];
        setRows(
          registers.map((r: any) => ({ id: r.id, name: r.name, isOpen: r.isOpen, version: r.version }))
        );
        const pd = res?.data?.data?.paginationData ?? {};
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
    [shopId, pagination.pageSize]
  );

  useEffect(() => {
    loadRegisters(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const openDetails = async (id: string) => {
    if (!shopId) return;
    const res = await fetchSingleRegister(id, shopId as string);
    setSelectedRegister(res?.data ?? null);
  };

  const handleToggleStatus = async (row: RegisterRow) => {
    if (!shopId) return;
    const body = { shopId, id: row.id, version: row.version };
    try {
      if (row.isOpen) {
        await disableRegister(body);
      } else {
        await enableRegister(body);
      }
      toast.success(`Register ${row.isOpen ? "Disabled" : "Enabled"} Successfully`);
      loadRegisters(pagination.current);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update register status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !shopId) return;
    setDeleteLoading(true);
    try {
      await deleteRegister(deleteTarget.id, shopId as string, deleteTarget.version);
      toast.success("Register deleted successfully");
      setDeleteTarget(null);
      loadRegisters(pagination.current);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete register");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex gap-4 p-6">
      <div className={selectedRegister ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Cash Management</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Registers</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button
            onClick={() => {
              setFormMode("add");
              setFormRegisterId(null);
              setFormOpen(true);
            }}
          >
            Add Register
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                rows.length === 0 &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-b-0">
                    {Array.from({ length: 3 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    No registers found.
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                >
                  <TableCell>
                    <button className="text-primary hover:underline" onClick={() => openDetails(row.id)}>
                      {row.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={row.isOpen ? "default" : "destructive"}>{row.isOpen ? "Open" : "Closed"}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                        Actions <ChevronDown className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="gap-2 whitespace-nowrap" onClick={() => { setHardwareRegister(row); setHardwareOpen(true); }}>
                          <Settings className="size-4 text-blue-500" />
                          Manage Hardware
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 whitespace-nowrap" onClick={() => handleToggleStatus(row)}>
                          <Power className={`size-4 ${row.isOpen ? "text-green-500" : "text-destructive"}`} />
                          Enable/Disable
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 whitespace-nowrap"
                          onClick={() => {
                            setFormMode("edit");
                            setFormRegisterId(row.id);
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
          onPageChange={(p: number) => loadRegisters(p)}
          pageSizeOptions={[30, 50, 100, 200]}
          onPageSizeChange={(s) => {
            setPagination((prev) => ({ ...prev, pageSize: s, current: 1 }));
            loadRegisters(1, s);
          }}
        />
      </div>

      {selectedRegister && (
        <div className="w-1/3">
          <RegisterDetailsPanel register={selectedRegister} onClose={() => setSelectedRegister(null)} />
        </div>
      )}

      <DeleteRegisterDrawer
        register={deleteTarget}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <ManageHardwareDialog
        open={hardwareOpen}
        register={hardwareRegister}
        onClose={() => {
          setHardwareOpen(false);
          setHardwareRegister(null);
        }}
      />

      <RegisterFormDrawer
        open={formOpen}
        mode={formMode}
        registerId={formRegisterId}
        onClose={() => setFormOpen(false)}
        onSaved={() => loadRegisters(pagination.current)}
      />
    </div>
  );
}
