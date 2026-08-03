"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSingleClassification } from "@/services/classifications/getSingle";
import { removeCategory } from "@/services/categories/remove";
import { getSingleTaxProfile } from "@/services/tax/getSingleTaxProfile";

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

import ActivityLogDrawer from "@/components/admin/ActivityLogDrawer";
import CategoryFormDrawer from "./CategoryFormDrawer";
import CategoryDetailsPanel from "./CategoryDetailsPanel";
import type { CategoryRow } from "./types";

interface ClassificationDetailsPanelProps {
  classificationId: string | number;
  onClose: () => void;
  onEdit: () => void;
}

interface ClassificationDetail {
  id: string | number;
  name: string;
  details?: string | null;
  image?: string | null;
  isMJ?: boolean;
  categories?: CategoryRow[];
}

interface TaxProfile {
  name: string;
  description?: string;
  taxes?: { externalId: string; taxName: string; taxRate: number }[];
}

export default function ClassificationDetailsPanel({
  classificationId,
  onClose,
  onEdit,
}: ClassificationDetailsPanelProps) {
  const { shopId } = useShop();

  const [classification, setClassification] = useState<ClassificationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);

  const [activityOpen, setActivityOpen] = useState(false);

  const [categoryDrawer, setCategoryDrawer] = useState<{
    open: boolean;
    mode: "add" | "edit";
    categoryId: string | number | null;
  }>({ open: false, mode: "add", categoryId: null });

  const [categoryDetailId, setCategoryDetailId] = useState<string | number | null>(null);
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState<CategoryRow | null>(null);
  const [categoryDeleteLoading, setCategoryDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSingleClassification(classificationId);
      setClassification(res?.data ?? null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load classification");
    } finally {
      setLoading(false);
    }
  }, [classificationId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!shopId) return;
    getSingleTaxProfile(classificationId, shopId)
      .then((res) => setTaxProfile(res?.data ?? null))
      .catch(() => setTaxProfile(null));
  }, [classificationId, shopId]);

  const handleDeleteCategory = async () => {
    if (!categoryDeleteTarget) return;
    setCategoryDeleteLoading(true);
    try {
      await removeCategory(categoryDeleteTarget.id);
      toast.success("Category deleted successfully");
      setCategoryDeleteTarget(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete category");
    } finally {
      setCategoryDeleteLoading(false);
    }
  };

  const sortedCategories = (classification?.categories ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex w-1/3 shrink-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Classification Details</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setActivityOpen(true)}>
              Activity
            </Button>
            <Button size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="outline" size="icon" onClick={onClose} className="size-7 shrink-0">
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <div className="h-px bg-border" />

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : classification ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-sm text-muted-foreground">Name:</span>
                <span className="flex-1 text-sm font-medium">{classification.name ?? "-"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-24 shrink-0 text-sm text-muted-foreground">Description:</span>
                <span className="flex-1 truncate text-sm">{classification.details ?? "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-sm text-muted-foreground">Image:</span>
                {classification.image ? (
                  <img
                    src={classification.image}
                    alt={classification.name}
                    className="size-16 rounded-lg object-cover ring-1 ring-foreground/10"
                  />
                ) : (
                  <span className="text-sm">-</span>
                )}
              </div>
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">Classification not found.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Categories</h2>
          <Button size="sm" onClick={() => setCategoryDrawer({ open: true, mode: "add", categoryId: null })}>
            <Plus /> Add Category
          </Button>
        </div>
        <div className="h-px bg-border" />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Name</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCategories.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                    No categories found.
                  </TableCell>
                </TableRow>
              )}
              {sortedCategories.map((category, i) => (
                <TableRow
                  key={category.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                >
                  <TableCell className="font-medium">
                    <button
                      onClick={() => setCategoryDetailId(category.id)}
                      className="cursor-pointer text-left text-primary hover:underline"
                    >
                      {category.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="line-clamp-1 max-w-40">{category.details || "-"}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setCategoryDrawer({ open: true, mode: "edit", categoryId: category.id })}
                      >
                        <Pencil />
                      </Button>
                      <Button variant="outline" size="icon-sm" onClick={() => setCategoryDeleteTarget(category)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Tax Profile Details</h2>
        </div>
        <div className="h-px bg-border" />

        {taxProfile ? (
          <div className="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-xs text-muted-foreground">Profile Name</span>
                <div className="text-sm font-medium">{taxProfile.name}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Description</span>
                <div className="text-sm">{taxProfile.description || "-"}</div>
              </div>
            </div>

            <Table>
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow className="bg-muted/60">
                  <TableHead>Tax Name</TableHead>
                  <TableHead>Tax Rate (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(taxProfile.taxes ?? []).map((tax) => (
                  <TableRow key={tax.externalId} className="border-b-0">
                    <TableCell>{tax.taxName}</TableCell>
                    <TableCell>{tax.taxRate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">No tax profile available</div>
        )}
      </div>

      <ActivityLogDrawer
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        domain="CLASSIFICATION"
        targetId={classificationId}
      />

      <CategoryFormDrawer
        open={categoryDrawer.open}
        mode={categoryDrawer.mode}
        categoryId={categoryDrawer.categoryId}
        defaultClassificationId={classificationId}
        onClose={() => setCategoryDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={load}
      />

      {categoryDetailId && (
        <CategoryDetailsPanel
          categoryId={categoryDetailId}
          onClose={() => setCategoryDetailId(null)}
          onEdit={() => {
            setCategoryDrawer({ open: true, mode: "edit", categoryId: categoryDetailId });
          }}
        />
      )}

      <AlertDialog
        open={!!categoryDeleteTarget}
        onOpenChange={(open) => !open && !categoryDeleteLoading && setCategoryDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{categoryDeleteTarget?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={categoryDeleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteCategory} disabled={categoryDeleteLoading}>
              {categoryDeleteLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
