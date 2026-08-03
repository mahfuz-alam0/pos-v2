"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Settings, Pencil, ScrollText, Trash2, Plus } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchDrawersList } from "@/services/drawers/list";
import { deleteDrawer } from "@/services/drawers/deleteDrawer";
import { getSingleDrawer } from "@/services/registers/getSingleDrawer";
import { listRegisters } from "@/services/registers/listRegisters";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DrawerDetailsPanel from "./DrawerDetailsPanel";
import DeleteDrawerDrawer from "./DeleteDrawerDrawer";
import DrawerFormDrawer from "./DrawerFormDrawer";

interface DrawerRow {
  id: string;
  name: string;
  isOpen: boolean;
  version: number;
  lastOpenedBy?: { name: string } | null;
  lastClosedBy?: { name: string } | null;
}

export default function DrawersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shopId } = useShop();

  const [rows, setRows] = useState<DrawerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 30, total: 0, totalPages: 1 });

  const [registers, setRegisters] = useState<{ id: string; name: string }[]>([]);
  const [registerFilter, setRegisterFilter] = useState(searchParams.get("registerId") || "__all__");

  const [selectedDrawer, setSelectedDrawer] = useState<any>(null);

  const [deleteTarget, setDeleteTarget] = useState<DrawerRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formDrawerId, setFormDrawerId] = useState<string | null>(null);

  const loadDrawers = useCallback(
    async (page = 1, registerId = registerFilter) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page, limit: pagination.pageSize };
        if (registerId !== "__all__") params.registerId = registerId;
        const res = await fetchDrawersList(shopId as string, params);
        const drawers = res?.data?.data?.drawers ?? [];
        setRows(drawers);
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
    [shopId, pagination.pageSize, registerFilter]
  );

  useEffect(() => {
    loadDrawers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    listRegisters(shopId as string).then((res) => setRegisters(res?.data?.data?.registers ?? []));
  }, [shopId]);

  const openDetails = async (id: string) => {
    const res = await getSingleDrawer(id);
    setSelectedDrawer(res?.data?.data?.drawer ?? null);
  };

  const handleRegisterFilterChange = (value: string) => {
    setRegisterFilter(value);
    loadDrawers(1, value);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !shopId) return;
    setDeleteLoading(true);
    try {
      await deleteDrawer(deleteTarget.id, shopId as string, deleteTarget.version);
      toast.success("Drawer deleted successfully");
      setDeleteTarget(null);
      loadDrawers(pagination.current);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete drawer");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex gap-4 p-6">
      <div className={selectedDrawer ? "flex w-2/3 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Cash Management</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>Drawers</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button
            onClick={() => {
              setFormMode("add");
              setFormDrawerId(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add Drawer
          </Button>
        </div>

        <Select
          items={[{ value: "__all__", label: "All Registers" }, ...registers.map((r) => ({ value: r.id, label: r.name }))]}
          value={registerFilter}
          onValueChange={handleRegisterFilterChange}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Please select a register" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Registers</SelectItem>
            {registers.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Name</TableHead>
                <TableHead>Last Opened By</TableHead>
                <TableHead>Last Closed By</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                rows.length === 0 &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-b-0">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No drawers found.
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                >
                  <TableCell>
                    <button className="text-primary hover:underline" onClick={() => openDetails(row.id)}>
                      {row.name}
                    </button>
                  </TableCell>
                  <TableCell>{row.lastOpenedBy?.name ?? "-"}</TableCell>
                  <TableCell>{row.lastClosedBy?.name ?? "-"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={row.isOpen ? "default" : "destructive"}>{row.isOpen ? "Open" : "Closed"}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="outline" size="sm">
                          Actions <ChevronDown className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          className="gap-2 whitespace-nowrap"
                          onClick={() => router.push(`/pos/drawers/settings/${row.id}`)}
                        >
                          <Settings className="size-4 text-blue-500" />
                          Manage / View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 whitespace-nowrap"
                          onClick={() => {
                            setFormMode("edit");
                            setFormDrawerId(row.id);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="size-4 text-sky-600" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 whitespace-nowrap"
                          onClick={() => router.push(`/admin/audit/drawer-log/${row.id}`)}
                        >
                          <ScrollText className="size-4 text-amber-600" />
                          Logs
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
          onPageChange={(p: number) => loadDrawers(p)}
        />
      </div>

      {selectedDrawer && (
        <div className="w-1/3">
          <DrawerDetailsPanel drawer={selectedDrawer} onClose={() => setSelectedDrawer(null)} />
        </div>
      )}

      <DeleteDrawerDrawer
        drawer={deleteTarget}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <DrawerFormDrawer
        open={formOpen}
        mode={formMode}
        drawerId={formDrawerId}
        onClose={() => setFormOpen(false)}
        onSaved={() => loadDrawers(pagination.current)}
      />
    </div>
  );
}
