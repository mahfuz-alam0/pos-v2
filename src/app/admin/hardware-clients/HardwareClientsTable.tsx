"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, Trash2 } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { fetchHardwareClients } from "@/services/hardwareClients/list";
import { removeHardwareClient } from "@/services/hardwareClients/remove";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
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

import { JOB_TYPES, type HardwareClient } from "./types";

export default function HardwareClientsTable() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [jobType, setJobType] = useState<string>("");

  const [rows, setRows] = useState<HardwareClient[]>([]);
  const [loading, setLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<HardwareClient | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadClients = useCallback(async (searchTerm: string, job: string) => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (searchTerm) params.search = searchTerm;
      if (job) params.jobType = job;
      const res = await fetchHardwareClients(params);
      setRows(res?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load hardware clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients(debouncedSearch, jobType);
  }, [loadClients, debouncedSearch, jobType]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeHardwareClient(deleteTarget._id);
      toast.success("Hardware client deleted successfully");
      setDeleteTarget(null);
      loadClients(debouncedSearch, jobType);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete hardware client");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Hardware Clients</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search By.."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={jobType || undefined} onValueChange={(v) => setJobType(v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Select Job Type" />
          </SelectTrigger>
          <SelectContent>
            {JOB_TYPES.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {jobType && (
          <Button variant="ghost" size="sm" onClick={() => setJobType("")}>
            Clear
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hardware Name</TableHead>
              <TableHead>Device Name</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Print Type</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow className="border-b-0">
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No hardware clients found
                </TableCell>
              </TableRow>
            ) : (
              rows.map((client, i) => (
                <TableRow
                  key={client._id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : "bg-background"}`}
                >
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.deviceProps?.deviceName ?? "-"}</TableCell>
                  <TableCell>{new Date(client.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{client.jobType?.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(client)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hardware Client</AlertDialogTitle>
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
