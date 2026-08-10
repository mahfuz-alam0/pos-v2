"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { fetchSectionsList } from "@/services/sections/list";
import { deleteSection } from "@/services/sections/remove";
import { listBusinessEntities } from "@/services/businessEntities/list";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import SectionFormDrawer from "./SectionFormDrawer";
import type { SectionRow } from "./types";

export default function SectionsTable() {
  const [rows, setRows] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const [entities, setEntities] = useState<{ id: string | number; name: string }[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entityId, setEntityId] = useState<string | null>(null);

  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; sectionId: string | number | null }>({
    open: false,
    mode: "add",
    sectionId: null,
  });

  const [deleteTarget, setDeleteTarget] = useState<SectionRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setEntitiesLoading(true);
    listBusinessEntities()
      .then((res) => setEntities(res?.data?.data?.businessEntities ?? []))
      .catch((err: any) => toast.error(err?.message || "Failed to load business entities"))
      .finally(() => setEntitiesLoading(false));
  }, []);

  const loadSections = useCallback(async () => {
    if (initialLoaded) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetchSectionsList(entityId);
      setRows(res?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load sections");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setInitialLoaded(true);
    }
  }, [entityId, initialLoaded]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteSection(deleteTarget.id);
      toast.success("Section deleted successfully");
      setDeleteTarget(null);
      loadSections();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete section");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Online Ordering</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Sections</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-end gap-3">
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Business Entity</div>
            <Select
              items={[
                { value: "__none__", label: "None" },
                ...entities.map((e) => ({ value: String(e.id), label: e.name })),
              ]}
              value={entityId ?? "__none__"}
              onValueChange={(value) => setEntityId(value === "__none__" ? null : value)}
              disabled={entitiesLoading}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select business entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => setDrawer({ open: true, mode: "add", sectionId: null })}>
            <Plus /> Add Section
          </Button>
        </div>
      </div>

      <div className="relative rounded-xl ring-1 ring-foreground/10">
        {refreshing && (
          <div className="absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-background/60 pt-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Title</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-28 text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow
                  key={`skeleton-${i}`}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                >
                  <TableCell colSpan={3}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!loading && rows.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={3} className="py-16 text-center text-muted-foreground">
                  No sections found.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              rows.map((section, i) => (
                <TableRow
                  key={section.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                >
                  <TableCell>{section.title ?? "-"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={!section.isDisabled ? "default" : "destructive"}>
                      {!section.isDisabled ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-28 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => setDrawer({ open: true, mode: "edit", sectionId: section.id })}
                        >
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(section)}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <SectionFormDrawer
        open={drawer.open}
        mode={drawer.mode}
        sectionId={drawer.sectionId}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={loadSections}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this section? This cannot be undone.
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
