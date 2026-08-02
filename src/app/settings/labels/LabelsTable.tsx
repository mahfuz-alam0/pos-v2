"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { fetchLabels } from "@/services/labels/list";
import { removeLabel } from "@/services/labels/remove";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

import { LabelFieldMap } from "./labelFieldMap";
import type { LabelModel } from "./types";

export default function LabelsTable() {
  const router = useRouter();

  const [rows, setRows] = useState<LabelModel[]>([]);
  const [loading, setLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<LabelModel | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadLabels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLabels();
      setRows(res?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load labels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLabels();
  }, [loadLabels]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeLabel(deleteTarget.id);
      toast.success("Label deleted successfully");
      setDeleteTarget(null);
      loadLabels();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete item");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => router.push("/settings/labels/add")}>
          <Plus /> Create Custom Package Label
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                  <TableCell colSpan={3}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow className="border-b-0">
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  No labels found
                </TableCell>
              </TableRow>
            ) : (
              rows.map((label, i) => (
                <TableRow
                  key={label.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : "bg-background"}`}
                >
                  <TableCell className="font-medium">{label.name}</TableCell>
                  <TableCell>{LabelFieldMap[label.templateType]?.label ?? label.templateType}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1.5">
                      <Button size="sm" onClick={() => router.push(`/settings/labels/edit/${label.id}`)}>
                        Config
                      </Button>
                      {label.preferredModelType && (
                        <Button variant="outline" size="icon-sm" onClick={() => setDeleteTarget(label)}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
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
            <AlertDialogTitle>Delete Label</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this label?</AlertDialogDescription>
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
