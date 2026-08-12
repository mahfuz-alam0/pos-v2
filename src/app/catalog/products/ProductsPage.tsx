"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Info, Loader2, Plus, X } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { fetchProductsList } from "@/services/products/list";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchTagsList } from "@/services/tags/list";
import { removeProduct } from "@/services/products/remove";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiSelect } from "@/components/ui/api-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

import { MultiApiSelect } from "@/components/ui/multi-api-select";
import Drawer from "@/components/ui/Drawer";
import AddEditProductDrawer from "./AddEditProductDrawer";
import BulkUploadDrawer from "./BulkUploadDrawer";
import BulkEditDrawer from "./BulkEditDrawer";
import MergeProductsDrawer from "./MergeProductsDrawer";
import ActivityLogDrawer from "./ActivityLogDrawer";
import ProductDetailsPanel from "./ProductDetailsPanel";
import type { PaginationState, ProductFilters, ProductRow } from "./types";
import { useSettings } from "@/context/settings-context";

const DEFAULT_FILTERS: ProductFilters = { search: "", brandIds: null, categoryIds: null, tagIds: null };

function buildParams(filters: ProductFilters, page: number, limit: number) {
  const params: Record<string, any> = { limit, page };
  if (filters.search) params.search = filters.search;
  if (filters.brandIds) params.brandIds = filters.brandIds;
  if (filters.categoryIds) params.categoryIds = filters.categoryIds;
  if (filters.tagIds && filters.tagIds.length > 0) params.tagIds = filters.tagIds;
  return params;
}

function tagLabel(tag: any) {
  return typeof tag === "object" && tag !== null ? tag.name : tag;
}

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("id");
  const { defaultPageSize } = useSettings();

  const [data, setData] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({ limit: defaultPageSize, page: 1, totalEntries: 0, totalPages: 0 });

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);

  const [selectedForMerge, setSelectedForMerge] = useState<ProductRow[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeList, setMergeList] = useState<ProductRow[]>([]);

  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [activityProductId, setActivityProductId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadProducts = useCallback(
    async (page = 1, size = pagination.limit) => {
      setLoading(true);
      try {
        const params = buildParams({ ...filters, search: debouncedSearch }, page, size);
        const res = await fetchProductsList(params);
        const products = res?.data ?? [];
        setData(products);
        const pd = res?.paginationData ?? {};
        setPagination({
          limit: pd.limit ?? size,
          page: pd.currentPage ?? page,
          totalEntries: pd.totalEntries ?? products.length,
          totalPages: pd.totalPages ?? 1,
        });
      } catch (err: any) {
        toast.error(err?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    },
    [filters, debouncedSearch, pagination.limit]
  );

  useEffect(() => {
    loadProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.brandIds, filters.categoryIds, filters.tagIds]);

  const hasActiveFilters = debouncedSearch || filters.brandIds || filters.categoryIds || (filters.tagIds && filters.tagIds.length > 0);

  const clearFilters = () => {
    setSearchInput("");
    setFilters(DEFAULT_FILTERS);
  };

  const openRow = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", id);
    router.push(`/catalog/products?${params.toString()}`, { scroll: false });
  };

  const closeDetail = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    router.push(`/catalog/products${params.toString() ? `?${params}` : ""}`, { scroll: false });
  };

  const isRowSelected = (id: string) => selectedForMerge.some((p) => p.id === id);

  const toggleRow = (row: ProductRow, checked: boolean) => {
    setSelectedForMerge((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      if (checked) byId.set(row.id, row);
      else byId.delete(row.id);
      return Array.from(byId.values());
    });
  };

  const toggleAllRows = (checked: boolean) => {
    setSelectedForMerge((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      data.forEach((row) => {
        if (checked) byId.set(row.id, row);
        else byId.delete(row.id);
      });
      return Array.from(byId.values());
    });
  };

  const handlePageChange = (page: number) => loadProducts(page);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeProduct(deleteTarget.id);
      toast.success("Product deleted successfully.");
      setDeleteTarget(null);
      loadProducts(pagination.page);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong, please try again later");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openBulkMerge = () => {
    if (selectedForMerge.length === 0) {
      toast.warning("Please select at least one product from the table to perform a merge.");
      return;
    }
    setMergeList(selectedForMerge);
    setMergeOpen(true);
  };

  return (
    <div className="flex gap-4 p-6">
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Catalog</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Products</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" /> Add Product
            </Button>
            <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
              Bulk Product Upload
            </Button>
            {selectedForMerge.length > 1 && (
              <>
                <Button variant="outline" onClick={() => setBulkEditOpen(true)}>
                  Bulk Edit ({selectedForMerge.length})
                </Button>
                <Button variant="outline" onClick={openBulkMerge}>
                  Merge ({selectedForMerge.length} selected)
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search product"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />

          <ApiSelect
            placeholder="Select Brand"
            value={filters.brandIds ?? null}
            onChange={(val) => setFilters((prev) => ({ ...prev, brandIds: (val as string) ?? null }))}
            fetchPage={async (page, search) => {
              const res = await fetchBrandsList({ page, limit: 20, ...(search ? { search } : {}) });
              return { items: (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
            }}
          />

          <ApiSelect
            placeholder="Select Category"
            value={filters.categoryIds ?? null}
            onChange={(val) => setFilters((prev) => ({ ...prev, categoryIds: (val as string) ?? null }))}
            fetchPage={async (page, search) => {
              const res = await fetchCategoriesList({ page, limit: 20, ...(search ? { search } : {}) });
              return { items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
            }}
          />

          <MultiApiSelect
            placeholder="Select Tag"
            value={filters.tagIds ?? []}
            onChange={(ids) => setFilters((prev) => ({ ...prev, tagIds: ids.length ? ids : null }))}
            fetchPage={async (page, search) => {
              const res = await fetchTagsList({ page, limit: 20, ...(search ? { search } : {}) });
              return { items: (res?.data ?? []).map((t: any) => ({ id: t.id, name: t.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
            }}
          />

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Reset
            </Button>
          )}
        </div>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && data.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead className="w-10">
                  <Checkbox
                    checked={data.length > 0 && data.every((row) => isRowSelected(row.id))}
                    onCheckedChange={(checked) => toggleAllRows(!!checked)}
                  />
                </TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="sticky right-0 z-10 w-28 bg-muted text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.35)]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                data.length === 0 &&
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-b-0">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && data.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No products found.
                  </TableCell>
                </TableRow>
              )}

              {data.map((row, i) => (
                <TableRow key={row.id} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                  <TableCell>
                    <Checkbox checked={isRowSelected(row.id)} onCheckedChange={(checked) => toggleRow(row, !!checked)} />
                  </TableCell>
                  <TableCell className="max-w-60 truncate" title={row.name}>
                    <div className="flex items-center gap-1.5">
                      <button className="cursor-pointer text-primary hover:underline" onClick={() => openRow(row.id)}>
                        {row.name}
                      </button>
                      {row.matrixId && (
                        <Tooltip>
                          <TooltipTrigger
                            className="inline-flex shrink-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(`/catalog/products/matrix?matrixId=${row.matrixId}`);
                            }}
                          >
                            <Info className="size-3.5 animate-pulse text-blue-500" />
                          </TooltipTrigger>
                          <TooltipContent>Associated With Matrix</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.category ? (
                      <Badge
                        className="w-fit text-white"
                        style={{ backgroundColor: row.category.colorCode?.includes("fff") ? "#018FDE" : row.category.colorCode }}
                      >
                        {row.category.name}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{row.brand?.name || "-"}</TableCell>
                  <TableCell className="max-w-50">
                    {row.tags && row.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline">
                            {tagLabel(tag)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell
                    className={`sticky right-0 z-10 w-28 text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.35)] ${i % 2 === 1 ? "bg-table-zebra" : "bg-background"}`}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="outline" size="sm">Actions <ChevronDown className="size-3.5" /></Button>} />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingProduct(row)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setActivityProductId(row.id)}>Activity</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(row)}>
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
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalEntries={pagination.totalEntries}
          pageSize={pagination.limit}
          loading={loading}
          onPageChange={handlePageChange}
          pageSizeOptions={[30, 50, 100, 200]}
          onPageSizeChange={(s) => {
            setPagination((prev) => ({ ...prev, limit: s, page: 1 }));
            loadProducts(1, s);
          }}
        />
      </div>

      <Drawer open={!!openId} onClose={closeDetail} side="right" size="40%">
        {openId && (
          <ProductDetailsPanel
            productId={openId}
            productName={data.find((p) => p.id === openId)?.name}
            onClose={closeDetail}
            onEdit={() => {
              const product = data.find((p) => p.id === openId);
              if (product) setEditingProduct(product);
            }}
          />
        )}
      </Drawer>

      <AddEditProductDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onDone={() => {
          setAddOpen(false);
          loadProducts(pagination.page);
        }}
      />

      <AddEditProductDrawer
        open={!!editingProduct}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onDone={() => {
          setEditingProduct(null);
          loadProducts(pagination.page);
        }}
      />

      <BulkUploadDrawer
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onUploaded={() => {
          setBulkUploadOpen(false);
          loadProducts(pagination.page);
        }}
      />

      <BulkEditDrawer
        open={bulkEditOpen}
        onClose={() => setBulkEditOpen(false)}
        selectedProducts={selectedForMerge}
        onSaved={() => {
          setBulkEditOpen(false);
          setSelectedForMerge([]);
          loadProducts(pagination.page);
        }}
      />

      <MergeProductsDrawer
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        mergeList={mergeList}
        onRemove={(id) => {
          setMergeList((prev) => prev.filter((p) => p.id !== id));
          setSelectedForMerge((prev) => prev.filter((p) => p.id !== id));
        }}
        onMerged={() => {
          setMergeOpen(false);
          setMergeList([]);
          setSelectedForMerge([]);
          loadProducts(pagination.page);
        }}
      />

      <ActivityLogDrawer open={!!activityProductId} onClose={() => setActivityProductId(null)} targetId={activityProductId} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>
              {deleteTarget?.brand?.name ? ` (${deleteTarget.brand.name})` : ""}? This cannot be undone.
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
