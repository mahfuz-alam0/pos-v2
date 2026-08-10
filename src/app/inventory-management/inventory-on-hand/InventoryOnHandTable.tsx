"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowUpDown, Loader2, Maximize2, Minimize2, Package, ShoppingBag, Layers, DollarSign } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchInventoryOnHandSummary } from "@/services/reporting/inventoryOnHandSummary";
import { fetchInventoryOnHandByProduct } from "@/services/reporting/inventoryOnHandByProduct";
import { fetchInventoryOnHandByPackage } from "@/services/reporting/inventoryOnHandByPackage";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchProductsList } from "@/services/products/list";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiSelect } from "@/components/ui/api-select";
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
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSettings } from "@/context/settings-context";
import Drawer from "@/components/ui/Drawer";
import EditInventoryForm from "@/app/inventory-management/inventory-and-pricing/edit/[id]/EditInventoryForm";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const PAGE_SIZE_OPTIONS = [30, 50, 100, 200];

const FULLSCREEN_TITLES = {
  products: "Product List",
  packages: "Packages List",
  tags: "Product Tag",
  brands: "Brands",
} as const;

type Filter = { name: string; value: any };

function buildFilters({
  categoryId,
  brandId,
  productId,
  isMJ,
  marginMode,
  minMarginPercent,
  maxMarginPercent,
}: {
  categoryId: string | number | null;
  brandId: string | number | null;
  productId: string | number | null;
  isMJ: string;
  marginMode: string;
  minMarginPercent: number | null;
  maxMarginPercent: number | null;
}): Filter[] {
  const filters: Filter[] = [];
  if (categoryId) filters.push({ name: "categoryId", value: categoryId });
  if (brandId) filters.push({ name: "brandId", value: brandId });
  if (productId) filters.push({ name: "productId", value: productId });
  if (isMJ !== "all") filters.push({ name: "isMj", value: isMJ });

  if (marginMode === "negative") {
    filters.push({ name: "minMarginPercent", value: -100 });
    filters.push({ name: "maxMarginPercent", value: 0 });
  } else if (marginMode === "positive") {
    filters.push({ name: "minMarginPercent", value: 0 });
    filters.push({ name: "maxMarginPercent", value: 100 });
  } else if (marginMode === "custom") {
    if (minMarginPercent != null) filters.push({ name: "minMarginPercent", value: minMarginPercent });
    if (maxMarginPercent != null) filters.push({ name: "maxMarginPercent", value: maxMarginPercent });
  }

  return filters;
}

function filtersToParams(filters: Filter[]) {
  return filters.reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {} as Record<string, any>);
}

function BarCell({ value, max, color, prefix = "" }: { value: number; max: number; color: string; prefix?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="relative flex h-full min-h-11.5 items-center justify-center">
      <div
        className="absolute inset-y-0 left-0 transition-[width]"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
      <span className="relative z-10 font-medium">
        {prefix}
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  loading: boolean;
}) {
  return (
    <Card className="min-w-38.5 gap-1 rounded-[9px] border-l-3 px-4 py-2.5 shadow-sm ring-0" style={{ borderLeftColor: color }}>
      <span className="text-[12px] text-muted-foreground">{label}</span>
      {loading ? (
        <Skeleton className="h-5 w-16" />
      ) : (
        <div className="flex items-center gap-1.5">
          <Icon className="size-4" style={{ color }} />
          <span className="text-base font-semibold" style={{ color }}>
            {value}
          </span>
        </div>
      )}
    </Card>
  );
}

/** Sort icon is decorative only — no sort behavior wired up yet. */
function SortableHead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <TableHead className={className}>
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className="size-3 text-muted-foreground/60" />
      </span>
    </TableHead>
  );
}

/** Shows real pagination controls once there's more than one page; otherwise a static "all loaded" status. */
function TableFooterStatus({
  pagination,
  pageSize,
  loading,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: {
  pagination: { page: number; totalPages: number; totalEntries: number };
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}) {
  if (pagination.totalPages > 1) {
    return (
      <TablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalEntries={pagination.totalEntries}
        pageSize={pageSize}
        loading={loading}
        onPageChange={onPageChange}
        pageSizeOptions={pageSizeOptions}
        onPageSizeChange={onPageSizeChange}
      />
    );
  }
  return (
    <p className="py-1 text-center text-sm text-muted-foreground">
      No more records ({pagination.totalEntries} of {pagination.totalEntries} items loaded)
    </p>
  );
}

type FilterType = "category" | "brand" | "product" | null;

export default function InventoryOnHandTable() {
  const { defaultPageSize } = useSettings();
  const { shopId } = useShop();

  const [activeTab, setActiveTab] = useState<"products" | "packages" | "tags" | "brands">("products");
  const [fullscreenTable, setFullscreenTable] = useState<"products" | "packages" | "tags" | "brands" | null>(null);

  const [categoryId, setCategoryId] = useState<string | number | null>(null);
  const [brandId, setBrandId] = useState<string | number | null>(null);
  const [productId, setProductId] = useState<string | number | null>(null);
  const [isMJ, setIsMJ] = useState("all");
  const [marginMode, setMarginMode] = useState("all");
  const [minMarginPercent, setMinMarginPercent] = useState<number | null>(-10);
  const [maxMarginPercent, setMaxMarginPercent] = useState<number | null>(20);

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>(null);
  const [editInventoryId, setEditInventoryId] = useState<string | number | null>(null);

  const [productRows, setProductRows] = useState<any[]>([]);
  const [packageRows, setPackageRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [productPagination, setProductPagination] = useState({ page: 1, totalPages: 1, totalEntries: 0 });
  const [packagePagination, setPackagePagination] = useState({ page: 1, totalPages: 1, totalEntries: 0 });
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const [stats, setStats] = useState({
    categoryCount: 0,
    productCount: 0,
    packageCount: 0,
    inventoryCost: "0.00",
    inventoryPrice: "0.00",
  });
  const [tagRows, setTagRows] = useState<{ topTag: string; cost: string }[]>([]);
  const [brandRows, setBrandRows] = useState<{ brand: string; percentCost: string }[]>([]);
  const [tagSearch, setTagSearch] = useState("");

  const isInitialMount = useRef(true);

  const activeFilters = buildFilters({
    categoryId,
    brandId,
    productId,
    isMJ,
    marginMode,
    minMarginPercent,
    maxMarginPercent,
  });

  const fetchSummary = useCallback(
    async (filters: Filter[]) => {
      if (!shopId) return;
      setSummaryLoading(true);
      try {
        const res = await fetchInventoryOnHandSummary(shopId, filtersToParams(filters));
        const { summary, tagInfo, brandInfo } = res || {};
        if (summary) {
          setStats({
            categoryCount: summary.categoryCount || 0,
            productCount: summary.productCount || 0,
            packageCount: summary.packageCount || 0,
            inventoryCost: (summary.inventoryCost || 0).toFixed(2),
            inventoryPrice: (summary.inventoryPrice || 0).toFixed(2),
          });
        }
        if (tagInfo) {
          setTagRows(
            Object.entries(tagInfo).map(([topTag, cost]) => ({
              topTag,
              cost: typeof cost === "number" ? cost.toFixed(2) : String(cost),
            }))
          );
        }
        if (brandInfo) {
          setBrandRows(
            Object.entries(brandInfo).map(([brand, percentCost]) => ({
              brand,
              percentCost: typeof percentCost === "number" ? `${percentCost.toFixed(2)}%` : `${percentCost}%`,
            }))
          );
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load summary");
      } finally {
        setSummaryLoading(false);
      }
    },
    [shopId]
  );

  const fetchProducts = useCallback(
    async (filters: Filter[], page = 1, size = pageSize) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params = { limit: size, page, ...filtersToParams(filters) };
        const res = await fetchInventoryOnHandByProduct(shopId, params);
        if (res?.tableData) {
          setProductRows(res.tableData);
          if (res.paginationData) {
            setProductPagination({
              page: res.paginationData.currentPage,
              totalPages: res.paginationData.totalPages,
              totalEntries: res.paginationData.totalEntries,
            });
          }
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load inventory data");
      } finally {
        setLoading(false);
      }
    },
    [shopId, pageSize]
  );

  const fetchPackages = useCallback(
    async (filters: Filter[], page = 1, size = pageSize) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params = { limit: size, page, ...filtersToParams(filters) };
        const res = await fetchInventoryOnHandByPackage(shopId, params);
        if (res?.tableData) {
          setPackageRows(res.tableData);
          if (res.paginationData) {
            setPackagePagination({
              page: res.paginationData.currentPage,
              totalPages: res.paginationData.totalPages,
              totalEntries: res.paginationData.totalEntries,
            });
          }
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load package data");
      } finally {
        setLoading(false);
      }
    },
    [shopId, pageSize]
  );

  const applyFilters = useCallback(() => {
    const filters = buildFilters({
      categoryId,
      brandId,
      productId,
      isMJ,
      marginMode,
      minMarginPercent,
      maxMarginPercent,
    });
    if (activeTab === "products") fetchProducts(filters);
    else fetchPackages(filters);
    fetchSummary(filters);
  }, [
    activeTab,
    categoryId,
    brandId,
    productId,
    isMJ,
    marginMode,
    minMarginPercent,
    maxMarginPercent,
    fetchProducts,
    fetchPackages,
    fetchSummary,
  ]);

  // Load on tab switch / shop change
  useEffect(() => {
    if (!shopId) return;
    if (activeTab === "products") fetchProducts(activeFilters);
    else fetchPackages(activeFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, shopId]);

  // Auto-apply on filter change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, brandId, productId, isMJ, marginMode]);

  // Debounced auto-apply for custom margin
  useEffect(() => {
    if (isInitialMount.current || marginMode !== "custom") return;
    const t = setTimeout(applyFilters, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minMarginPercent, maxMarginPercent]);

  const handleDrillFilter = async (record: any, type: Exclude<FilterType, null>) => {
    const value =
      type === "category" ? record.categoryName : type === "brand" ? record.brandName : record.productName;
    const id = type === "category" ? record.categoryId : type === "brand" ? record.brandId : record.productId;

    if (selectedFilter === value && filterType === type) {
      setSelectedFilter(null);
      setFilterType(null);
      await fetchSummary([]);
      return;
    }
    setSelectedFilter(value);
    setFilterType(type);
    const filters: Filter[] = id ? [{ name: `${type}Id`, value: id }] : [];
    await fetchSummary(filters);
  };

  const clearAllFilters = () => {
    setCategoryId(null);
    setBrandId(null);
    setProductId(null);
    setIsMJ("all");
    setMarginMode("all");
    setMinMarginPercent(-10);
    setMaxMarginPercent(20);
    setSelectedFilter(null);
    setFilterType(null);
    if (activeTab === "products") fetchProducts([]);
    else fetchPackages([]);
    fetchSummary([]);
  };

  const fetchCategoryPage = useCallback(async (page: number, search: string) => {
    const res = await fetchCategoriesList({ page, limit: 10, search });
    return {
      items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const fetchBrandPage = useCallback(async (page: number, search: string) => {
    const res = await fetchBrandsList({ page, limit: 10, search });
    return {
      items: (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const fetchProductPage = useCallback(async (page: number, search: string) => {
    const res = await fetchProductsList({ page, limit: 10, search });
    return {
      items: (res?.data ?? []).map((p: any) => ({ id: p.id, name: p.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const filteredTagRows = tagRows.filter((t) => t.topTag.toLowerCase().includes(tagSearch.toLowerCase()));

  const maxQty = Math.max(...productRows.map((r) => r.qtyOnHand || 0), 1);
  const maxCost = Math.max(...productRows.map((r) => r.avgItemCost || 0), 1);
  const maxTotalCost = Math.max(
    ...productRows.map((r) => r.cost || (r.avgItemCost || 0) * (r.qtyOnHand || 0)),
    1
  );
  const maxUnitPrice = Math.max(...productRows.map((r) => r.unitPrice || 0), 1);
  const maxPkgQty = Math.max(...packageRows.map((r) => r.qtyOnHand || 0), 1);

  function renderCellHighlight(active: boolean) {
    return active ? "bg-blue-100 font-semibold dark:bg-blue-950/50" : "";
  }

  function ProductsTable({ inModal = false }: { inModal?: boolean }) {
    return (
      <div className="flex flex-col gap-3">
      <div className={inModal ? "h-[calc(100vh-105px)] overflow-auto *:data-[slot=table-container]:overflow-visible" : "relative overflow-hidden rounded-xl ring-1 ring-foreground/10"}>
        <Table>
          <TableHeader className={inModal ? "sticky top-0 z-10 [&_tr]:border-b-0" : "[&_tr]:border-b-0"}>
            <TableRow className="bg-muted/60">
              <SortableHead className="w-46.5 px-4">Category</SortableHead>
              <SortableHead className="w-38.5 px-4">Brand</SortableHead>
              <SortableHead className="min-w-100 flex-1 px-4">Product</SortableHead>
              <SortableHead className="w-38.5 justify-center px-4 text-center">Quantity On Hand</SortableHead>
              <SortableHead className="w-31.25 justify-center px-4 text-center">Average Item Cost</SortableHead>
              <SortableHead className="w-36.25 justify-center px-4 text-center">Total Cost</SortableHead>
              <SortableHead className="w-31.25 justify-center px-4 text-center">Unit Price</SortableHead>
              <SortableHead className="w-31.25 justify-center px-4 text-center">Margin</SortableHead>
              <TableHead className="w-26.25 px-4 text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && productRows.length === 0 &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`s-${i}`} className="border-b-0">
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && productRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  No inventory found.
                </TableCell>
              </TableRow>
            )}

            {productRows.map((row, i) => {
              const cp = row.avgItemCost || 0;
              const sp = row.unitPrice || 0;
              const margin = sp !== 0 ? ((sp - cp) / sp) * 100 : 0;
              const totalCost = row.cost || cp * (row.qtyOnHand || 0);
              return (
                <TableRow key={row.id || i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                  <TableCell
                    className={`max-w-46.5 cursor-pointer truncate px-4 ${renderCellHighlight(selectedFilter === row.categoryName && filterType === "category")}`}
                    title={row.categoryName}
                    onClick={() => row.categoryName && handleDrillFilter(row, "category")}
                  >
                    {row.categoryName || "-"}
                  </TableCell>
                  <TableCell
                    className={`max-w-38.5 cursor-pointer truncate px-4 ${renderCellHighlight(selectedFilter === row.brandName && filterType === "brand")}`}
                    title={row.brandName}
                    onClick={() => row.brandName && handleDrillFilter(row, "brand")}
                  >
                    {row.brandName || "-"}
                  </TableCell>
                  <TableCell
                    className={`min-w-100 cursor-pointer truncate px-4 ${renderCellHighlight(selectedFilter === row.productName && filterType === "product")}`}
                    title={row.productName}
                    onClick={() => row.productName && handleDrillFilter(row, "product")}
                  >
                    {row.productName}
                  </TableCell>
                  <TableCell className="p-0 text-center font-semibold">
                    <BarCell value={row.qtyOnHand || 0} max={maxQty} color="#e6f7ff" />
                  </TableCell>
                  <TableCell className="p-0 text-center font-semibold">
                    <BarCell value={cp} max={maxCost} color="#f0f5ff" prefix="$" />
                  </TableCell>
                  <TableCell className="p-0 text-center font-semibold">
                    <BarCell value={totalCost} max={maxTotalCost} color="#fff7e6" prefix="$" />
                  </TableCell>
                  <TableCell className="p-0 text-center font-semibold">
                    <BarCell value={sp} max={maxUnitPrice} color="#f6ffed" prefix="$" />
                  </TableCell>
                  <TableCell className="px-4 text-center font-semibold">{margin.toFixed(2)}%</TableCell>
                  <TableCell className="px-4 text-center">
                    <Button
                      className="h-9! rounded! px-3.5! text-[14px]! font-medium!"
                      onClick={() => setEditInventoryId(row.inventoryId)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <TableFooterStatus
        pagination={productPagination}
        pageSize={pageSize}
        loading={loading}
        onPageChange={(p) => fetchProducts(activeFilters, p)}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={(s) => {
          setPageSize(s);
          fetchProducts(activeFilters, 1, s);
        }}
      />
      </div>
    );
  }

  function PackagesTable({ inModal = false }: { inModal?: boolean }) {
    return (
      <div className="flex flex-col gap-3">
      <div className={inModal ? "h-[calc(100vh-105px)] overflow-auto *:data-[slot=table-container]:overflow-visible" : "relative overflow-hidden rounded-xl ring-1 ring-foreground/10"}>
        <Table>
          <TableHeader className={inModal ? "sticky top-0 z-10 [&_tr]:border-b-0" : "[&_tr]:border-b-0"}>
            <TableRow className="bg-muted/60">
              <SortableHead className="w-38.5 justify-center px-4 text-center">Expiry Date</SortableHead>
              <SortableHead className="min-w-100 flex-1 px-4">Product</SortableHead>
              <SortableHead className="w-62.5 px-4">Metrc ID</SortableHead>
              <SortableHead className="w-62.5 px-4">Shop Name</SortableHead>
              <SortableHead className="w-26.25 justify-center px-4 text-center">Age</SortableHead>
              <SortableHead className="w-38.5 justify-center px-4 text-center">Quantity On Hand</SortableHead>
              <TableHead className="w-26.25 px-4 text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && packageRows.length === 0 &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`s-${i}`} className="border-b-0">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && packageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No packages found.
                </TableCell>
              </TableRow>
            )}

            {packageRows.map((row, i) => {
              const days = row.createdAt
                ? Math.floor(Math.abs(Date.now() - new Date(row.createdAt).getTime()) / 86400000)
                : null;
              return (
                <TableRow key={row.packageId || i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                  <TableCell className="px-4 text-center">{row.expiryDate || "N/A"}</TableCell>
                  <TableCell className="min-w-100 truncate px-4" title={row.productName}>
                    {row.productName}
                  </TableCell>
                  <TableCell className="max-w-62.5 truncate px-4" title={row.advertisedId}>
                    {row.advertisedId}
                  </TableCell>
                  <TableCell className="max-w-62.5 truncate px-4" title={row.shopName}>
                    {row.shopName}
                  </TableCell>
                  <TableCell className="px-4 text-center">{days == null ? "N/A" : `${days} day${days !== 1 ? "s" : ""}`}</TableCell>
                  <TableCell className="p-0 text-center font-semibold">
                    <BarCell value={row.qtyOnHand || 0} max={maxPkgQty} color="#e6f7ff" />
                  </TableCell>
                  <TableCell className="px-4 text-center">
                    {row.inventoryId ? (
                      <Button
                        className="h-9! rounded! px-3.5! text-[14px]! font-medium!"
                        onClick={() => setEditInventoryId(row.inventoryId)}
                      >
                        Edit
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <TableFooterStatus
        pagination={packagePagination}
        pageSize={pageSize}
        loading={loading}
        onPageChange={(p) => fetchPackages(activeFilters, p)}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={(s) => {
          setPageSize(s);
          fetchPackages(activeFilters, 1, s);
        }}
      />
      </div>
    );
  }

  function TagsTable({ inModal = false }: { inModal?: boolean }) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Input
            placeholder="Search"
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            className="h-10 w-64 rounded-md text-[14px]"
          />
          <span className="text-xs text-muted-foreground">
            {filteredTagRows.length} {filteredTagRows.length === 1 ? "record" : "records"}
          </span>
        </div>
        <div className={inModal ? "h-[calc(100vh-160px)] overflow-auto *:data-[slot=table-container]:overflow-visible" : "relative overflow-hidden rounded-xl ring-1 ring-foreground/10"}>
            <Table>
              <TableHeader className={inModal ? "sticky top-0 z-10 [&_tr]:border-b-0" : "[&_tr]:border-b-0"}>
                <TableRow className="bg-muted/60">
                  <TableHead className="px-4">Top Tag</TableHead>
                  <TableHead className="px-4 text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTagRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                      No data
                    </TableCell>
                  </TableRow>
                )}
                {filteredTagRows.map((t, i) => (
                  <TableRow key={i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                    <TableCell className="px-4">{t.topTag}</TableCell>
                    <TableCell className="px-4 text-right">${t.cost}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
      </div>
    );
  }

  function BrandsTable({ inModal = false }: { inModal?: boolean }) {
    return (
      <div className={inModal ? "h-[calc(100vh-105px)] overflow-auto *:data-[slot=table-container]:overflow-visible" : "relative overflow-hidden rounded-xl ring-1 ring-foreground/10"}>
          <Table>
            <TableHeader className={inModal ? "sticky top-0 z-10 [&_tr]:border-b-0" : "[&_tr]:border-b-0"}>
              <TableRow className="bg-muted/60">
                <TableHead className="px-4">Brand</TableHead>
                <TableHead className="px-4 text-right">% Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brandRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                    No data
                  </TableCell>
                </TableRow>
              )}
              {brandRows.map((b, i) => (
                <TableRow key={i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                  <TableCell className="px-4">{b.brand}</TableCell>
                  <TableCell className="px-4 text-right">{b.percentCost}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-9 py-6">
      <div className="mb-1.5 flex flex-col gap-1.5">
        <h1 className="text-[22px] font-medium">Inventory On Hand</h1>
        <Breadcrumb>
          <BreadcrumbList className="text-[14px]">
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/inventory-management">Insights</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-primary">Inventory On Hand</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <Card className="min-h-17 justify-center gap-0 rounded-[10px] p-5 shadow-sm ring-0">
        <div className="flex flex-wrap items-center gap-3">
          <ApiSelect
            placeholder="Category"
            value={categoryId}
            onChange={setCategoryId}
            fetchPage={fetchCategoryPage}
            triggerClassName="h-10 w-50 rounded-md text-[14px]"
          />
          <ApiSelect
            placeholder="Brand"
            value={brandId}
            onChange={setBrandId}
            fetchPage={fetchBrandPage}
            triggerClassName="h-10 w-50 rounded-md text-[14px]"
          />
          <ApiSelect
            placeholder="Product"
            value={productId}
            onChange={setProductId}
            fetchPage={fetchProductPage}
            triggerClassName="h-10 w-62.5 rounded-md text-[14px]"
          />

          <Select value={marginMode} onValueChange={setMarginMode}>
            <SelectTrigger className="h-10! w-40 rounded-md text-[14px]">
              <SelectValue placeholder="Margin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="negative">Negative Margin</SelectItem>
              <SelectItem value="positive">Positive Margin</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {marginMode === "custom" && (
            <>
              <Input
                type="number"
                placeholder="Min %"
                value={minMarginPercent ?? ""}
                onChange={(e) => setMinMarginPercent(e.target.value === "" ? null : Number(e.target.value))}
                className="h-10 w-24 rounded-md text-[14px]"
              />
              <span className="text-muted-foreground">:</span>
              <Input
                type="number"
                placeholder="Max %"
                value={maxMarginPercent ?? ""}
                onChange={(e) => setMaxMarginPercent(e.target.value === "" ? null : Number(e.target.value))}
                className="h-10 w-24 rounded-md text-[14px]"
              />
            </>
          )}

          <Select value={isMJ} onValueChange={setIsMJ}>
            <SelectTrigger className="h-10! w-40 rounded-md text-[14px]">
              <SelectValue placeholder="MJ Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">MJ</SelectItem>
              <SelectItem value="false">Non-MJ</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="h-10 rounded-md px-3 text-[14px]" onClick={clearAllFilters}>
            Clear All
          </Button>
        </div>
      </Card>

      {selectedFilter && filterType && (
        <Card className="gap-0 border-l-3 border-l-blue-500 bg-blue-50 p-4 ring-0 dark:bg-blue-950/20">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">
              Showing statistics for <strong>{filterType}</strong>:{" "}
              <strong className="text-blue-600 dark:text-blue-400">{selectedFilter}</strong>
            </span>
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                setSelectedFilter(null);
                setFilterType(null);
                await fetchSummary([]);
              }}
            >
              Clear Selection
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-start gap-3">
        <StatCard label="Category Count" value={stats.categoryCount} icon={Layers} color="#1890ff" loading={summaryLoading} />
        <StatCard label="Product Count" value={stats.productCount} icon={ShoppingBag} color="#52c41a" loading={summaryLoading} />
        <StatCard label="Package Count" value={stats.packageCount} icon={Package} color="#faad14" loading={summaryLoading} />
        <StatCard label="Inventory Cost" value={`$${stats.inventoryCost}`} icon={DollarSign} color="#f5222d" loading={summaryLoading} />
        <StatCard label="Inventory Price Total" value={`$${stats.inventoryPrice}`} icon={DollarSign} color="#fa541c" loading={summaryLoading} />
      </div>

      <div className="flex flex-col gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <div className="flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="products">Product List</TabsTrigger>
              <TabsTrigger value="packages">Packages List</TabsTrigger>
              <TabsTrigger value="tags">Product Tag</TabsTrigger>
              <TabsTrigger value="brands">Brands</TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="icon" title="Full Screen" onClick={() => setFullscreenTable(activeTab)}>
              <Maximize2 className="size-4 text-foreground/60" />
            </Button>
          </div>

          <TabsContent value="products" className="mt-4">
            <ProductsTable />
          </TabsContent>
          <TabsContent value="packages" className="mt-4">
            <PackagesTable />
          </TabsContent>
          <TabsContent value="tags" className="mt-4">
            <TagsTable />
          </TabsContent>
          <TabsContent value="brands" className="mt-4">
            <BrandsTable />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={fullscreenTable !== null} onOpenChange={(open) => !open && setFullscreenTable(null)}>
        <DialogContent className="h-screen w-screen max-w-none p-0" showCloseButton={false}>
          <DialogHeader className="flex-row items-center justify-between border-b p-4">
            <DialogTitle>{fullscreenTable && FULLSCREEN_TITLES[fullscreenTable]}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setFullscreenTable(null)}>
              <Minimize2 className="size-4" />
            </Button>
          </DialogHeader>
          {fullscreenTable === "products" && <ProductsTable inModal />}
          {fullscreenTable === "packages" && <PackagesTable inModal />}
          {fullscreenTable === "tags" && <TagsTable inModal />}
          {fullscreenTable === "brands" && <BrandsTable inModal />}
        </DialogContent>
      </Dialog>

      <Drawer open={editInventoryId !== null} onClose={() => setEditInventoryId(null)} side="right" size="60%">
        <div className="h-full overflow-y-auto">
          {editInventoryId !== null && (
            <EditInventoryForm inventoryId={editInventoryId} onClose={() => setEditInventoryId(null)} />
          )}
        </div>
      </Drawer>
    </div>
  );
}
