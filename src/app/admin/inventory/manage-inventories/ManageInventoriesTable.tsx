"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchInventoriesList } from "@/services/inventories/list";
import { checkIsOpenForSellableStores } from "@/services/inventories/checkOpenForSellable";
import { deleteInventory } from "@/services/inventories/deleteInventory";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const PAGE_SIZE = 30;

function healthColor(totalQuantity, threshold) {
  if (totalQuantity > threshold) return "bg-green-500";
  if (totalQuantity < threshold && threshold > 0) return "bg-yellow-500";
  if (totalQuantity <= 0 || threshold <= 0) return "bg-red-500";
  return "bg-gray-400";
}

function mapInventory(inventory) {
  return {
    id: inventory.id,
    name: inventory.productName,
    status: inventory.isActive,
    quantity: inventory.totalActiveQuantity,
    unitPrice: inventory.unitPrice,
    sellableUoMShortForm: inventory.sellableUoMShortForm,
    threshold: inventory.thresholdStock,
    totalQuantity: inventory.totalQuantity,
    category: inventory?.category?.name ?? "N/A",
    brand: inventory?.brand?.name ?? "N/A",
    sellableOnStore: inventory.totalSellableQuantityOnPhysicalStore,
  };
}

export default function ManageInventoriesTable() {
  const router = useRouter();
  const { shopId } = useShop();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadInventories = useCallback(
    async (targetPage = 1) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params = { limit: PAGE_SIZE, page: targetPage };
        if (search) params.name = search;
        if (categoryId) params.categoryId = categoryId;
        if (brandId) params.brandId = brandId;

        const res = await fetchInventoriesList(shopId, params);
        const inventories = res?.data?.data?.inventories ?? [];
        setRows(inventories.map(mapInventory));

        const pagination = res?.data?.data?.paginationData;
        if (pagination) {
          setTotalPages(pagination.totalPages ?? 1);
          setTotalEntries(pagination.totalEntries ?? inventories.length);
        }
        setPage(targetPage);
      } catch (err) {
        toast.error(err?.message || "Failed to load inventory list");
      } finally {
        setLoading(false);
      }
    },
    [shopId, search, categoryId, brandId]
  );

  useEffect(() => {
    loadInventories(1);
  }, [shopId, search, categoryId, brandId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetchCategoriesList(),
          fetchBrandsList(),
        ]);
        setCategoryOptions(catRes?.data ?? []);
        setBrandOptions(brandRes?.data ?? []);

        const sellableRes = await checkIsOpenForSellableStores(shopId);
        if (sellableRes?.data?.data?.available === false) {
          // Store isn't currently open for physical-store sellable stock — informational only, no UI gate here yet.
        }
      } catch {
        // handleApiError already surfaced/handled the failure (e.g. logout on 401).
      }
    })();
  }, [shopId]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteInventory(deleteTarget.id, shopId);
      toast.success("Inventory deleted");
      setDeleteTarget(null);
      loadInventories(page);
    } catch (err) {
      toast.error(err?.message || "Failed to delete inventory");
    } finally {
      setDeleteLoading(false);
    }
  };

  const rangeLabel = useMemo(() => {
    if (totalEntries === 0) return "0 results";
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, totalEntries);
    return `${start}-${end} of ${totalEntries}`;
  }, [page, totalEntries]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Manage Inventories</h1>
        <Button onClick={() => router.push("/admin/catalog/products/add")}>
          <Plus /> Add Inventory
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search product name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />

        <Select value={categoryId} onValueChange={(v) => setCategoryId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={brandId} onValueChange={(v) => setBrandId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brandOptions.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="border-b-0 bg-muted/60">
              <TableHead className="w-70">Product Name</TableHead>
              <TableHead className="text-center">Health</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-center">Total Qty</TableHead>
              <TableHead className="text-center">Unit Price</TableHead>
              <TableHead className="text-center">Sellable Qty</TableHead>
              <TableHead className="text-center">Sellable In Store</TableHead>
              <TableHead className="w-28 text-center">Status</TableHead>
              <TableHead className="sticky right-0 z-10 w-40 bg-muted text-right shadow-[-1px_0_0_0_var(--border)]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  No inventory items found.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              rows.map((row, i) => (
                <TableRow key={row.id} className={`border-b-0 ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                  <TableCell className="max-w-70 truncate font-medium">
                    <Link
                      href={`/admin/inventory/manage-inventories/edit/${row.id}`}
                      className="hover:underline"
                      title={row.name}
                    >
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`mx-auto inline-block size-3 rounded-full ${healthColor(row.totalQuantity, row.threshold)}`}
                      title={
                        row.totalQuantity > row.threshold
                          ? "Healthy"
                          : row.totalQuantity <= 0 || row.threshold <= 0
                            ? "Out of Stock"
                            : "Low Stock"
                      }
                    />
                  </TableCell>
                  <TableCell className="max-w-40 truncate">{row.category}</TableCell>
                  <TableCell>{row.brand}</TableCell>
                  <TableCell className="text-center">
                    {row.totalQuantity} {row.sellableUoMShortForm}
                  </TableCell>
                  <TableCell className="text-center">${row.unitPrice}</TableCell>
                  <TableCell className="text-center">
                    {row.quantity} {row.sellableUoMShortForm}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.sellableOnStore} {row.sellableUoMShortForm}
                  </TableCell>
                  <TableCell className="w-28 text-center">
                    <Badge variant={row.status ? "default" : "destructive"}>
                      {row.status ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`sticky right-0 z-10 w-40 text-right shadow-[-1px_0_0_0_var(--border)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : "bg-background"}`}
                  >
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/inventory/manage-inventories/edit/${row.id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(row)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{rangeLabel}</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => loadInventories(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => loadInventories(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete inventory item</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot;. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
