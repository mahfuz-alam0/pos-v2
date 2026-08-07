"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Plus, X } from "lucide-react";

import { getTaxProfiles } from "@/services/tax/getTaxProfiles";
import { getSingleTax } from "@/services/tax/getSingleTax";
import { deleteTax } from "@/services/tax/deleteTax";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

import TaxDrawer from "./TaxDrawer";
import type { TaxProfile } from "./types";

export default function TaxesTable() {
  const [rows, setRows] = useState<TaxProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [selectedTax, setSelectedTax] = useState<TaxProfile | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; taxId: string | number | null }>({
    open: false,
    mode: "add",
    taxId: null,
  });

  const [deleteTarget, setDeleteTarget] = useState<TaxProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadTaxes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTaxProfiles(1, 30);
      setRows(res?.data?.taxProfiles ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load tax profiles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTaxes();
  }, [loadTaxes]);

  const openDetails = async (tax: TaxProfile) => {
    setSelectedId(tax.id);
    setDetailsLoading(true);
    try {
      const res = await getSingleTax(tax.id);
      setSelectedTax(res?.data ?? tax);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch tax details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedId(null);
    setSelectedTax(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteTax(deleteTarget.id);
      toast.success("Tax profile deleted successfully");
      if (selectedId === deleteTarget.id) closeDetails();
      setDeleteTarget(null);
      loadTaxes();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete tax profile");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex gap-6 p-6">
      <Card className={`flex-1 gap-4 p-4 ${selectedId ? "max-w-[65%]" : ""}`}>
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Tax Profiles</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Button onClick={() => setDrawer({ open: true, mode: "add", taxId: null })}>
            <Plus /> Add Tax Profile
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Highlight</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                    <TableCell colSpan={4}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow className="border-b-0">
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No tax profiles found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((tax, i) => (
                  <TableRow
                    key={tax.id}
                    onClick={() => openDetails(tax)}
                    className={`cursor-pointer border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : "bg-background"}`}
                  >
                    <TableCell className="font-medium text-primary">{tax.name}</TableCell>
                    <TableCell>{tax.classificationName || "-"}</TableCell>
                    <TableCell>{tax.highlights || "-"}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrawer({ open: true, mode: "edit", taxId: tax.id });
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(tax);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {selectedId && (
        <div className="w-[35%] shrink-0">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold">Tax Details</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setDrawer({ open: true, mode: "edit", taxId: selectedId })}>
                Edit
              </Button>
              <Button variant="outline" size="icon-sm" onClick={closeDetails}>
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {detailsLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            selectedTax && (
              <div className="flex flex-col gap-3">
                <Card className="gap-3 p-4">
                  <p className="text-sm font-semibold">Basic Information</p>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="font-medium">Name:</span>
                      <span className="truncate">{selectedTax.name}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-medium">Description:</span>
                      <span className="truncate">{selectedTax.description || "N/A"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-medium">Classification:</span>
                      <span className="truncate">{selectedTax.classification?.name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-medium">Tax Application Method:</span>
                      <span className="text-right">
                        {selectedTax.isIncluded ? "Tax included" : "Tax not included"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium">Default for MJ Product:</span>
                      <Badge variant={selectedTax.isDefaultForMJ ? "default" : "secondary"}>
                        {selectedTax.isDefaultForMJ ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium">Default for Non-MJ Product:</span>
                      <Badge variant={selectedTax.isDefaultForNonMJ ? "default" : "secondary"}>
                        {selectedTax.isDefaultForNonMJ ? "Yes" : "No"}
                      </Badge>
                    </div>
                    {selectedTax.createdAt && (
                      <div className="flex justify-between gap-4">
                        <span className="font-medium">Created:</span>
                        <span>{new Date(selectedTax.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedTax.updatedAt && (
                      <div className="flex justify-between gap-4">
                        <span className="font-medium">Last Updated:</span>
                        <span>{new Date(selectedTax.updatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </Card>

                {(selectedTax.taxes?.length ?? 0) > 0 && (
                  <Card className="gap-3 p-4">
                    <p className="text-sm font-semibold">Tax Charges</p>
                    <div className="flex flex-col gap-2">
                      {selectedTax.taxes?.map((tax, index) => (
                        <div key={index} className="rounded-lg bg-muted p-2.5 text-xs">
                          <div className="mb-1 flex justify-between font-medium">
                            <span>{tax.taxName}</span>
                            <span>{tax.taxRate}%</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Type: {tax.taxType}</span>
                            <span>
                              {tax.compoundTaxReferences?.length > 0
                                ? `Compound of ${tax.compoundTaxReferences.length}`
                                : "Non-compound"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )
          )}
        </div>
      )}

      <TaxDrawer
        open={drawer.open}
        mode={drawer.mode}
        taxId={drawer.taxId}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={() => {
          loadTaxes();
          if (selectedId) openDetails({ id: selectedId } as TaxProfile);
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tax Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
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
