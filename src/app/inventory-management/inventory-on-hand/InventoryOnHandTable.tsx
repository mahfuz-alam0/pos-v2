"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Maximize2, Minimize2, Package, ShoppingBag, Layers, DollarSign, Tag as TagIcon } from "lucide-react";

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

const PAGE_SIZE = 50;

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
    <Card className="min-w-38.5 gap-1 border-l-3 py-2.5 px-3 shadow-sm" style={{ borderLeftColor: color }}>
      <span className="text-xs text-muted-foreground">{label}</span>
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

type FilterType = "category" | "brand" | "product" | null;

export default function InventoryOnHandTable() {
  const { shopId } = useShop();

  const [activeTab, setActiveTab] = useState<"products" | "packages">("products");
  const [fullscreenTable, setFullscreenTable] = useState<"products" | "packages" | null>(null);

  const [categoryId, setCategoryId] = useState<string | number | null>(null);
  const [brandId, setBrandId] = useState<string | number | null>(null);
  const [productId, setProductId] = useState<string | number | null>(null);
  const [isMJ, setIsMJ] = useState("all");
  const [marginMode, setMarginMode] = useState("all");
  const [minMarginPercent, setMinMarginPercent] = useState<number | null>(-10);
  const [maxMarginPercent, setMaxMarginPercent] = useState<number | null>(20);

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>(null);

  const [productRows, setProductRows] = useState<any[]>([]);
  const [packageRows, setPackageRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [productPagination, setProductPagination] = useState({ page: 1, totalPages: 1, totalEntries: 0 });
  const [packagePagination, setPackagePagination] = useState({ page: 1, totalPages: 1, totalEntries: 0 });

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
    async (filters: Filter[], page = 1) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params = { limit: PAGE_SIZE, page, ...filtersToParams(filters) };
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
    [shopId]
  );

  const fetchPackages = useCallback(
    async (filters: Filter[], page = 1) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params = { limit: PAGE_SIZE, page, ...filtersToParams(filters) };
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
    [shopId]
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
      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className={inModal ? "h-[calc(100vh-105px)] overflow-auto" : "h-[calc(100vh-500px)] min-h-100 overflow-auto"}>
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead className="w-45">Category</TableHead>
              <TableHead className="w-37.5">Brand</TableHead>
              <TableHead className="w-100">Product</TableHead>
              <TableHead className="w-37.5 text-center">Qty On Hand</TableHead>
              <TableHead className="w-30 text-center">Avg Item Cost</TableHead>
              <TableHead className="w-35 text-center">Total Cost</TableHead>
              <TableHead className="w-30 text-center">Unit Price</TableHead>
              <TableHead className="w-30 text-center">Margin</TableHead>
              <TableHead className="w-25 text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && productRows.length === 0 &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`s-${i}`} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && productRows.length === 0 && (
              <TableRow className="border-b-0">
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
                <TableRow key={row.id || i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                  <TableCell
                    className={`max-w-45 cursor-pointer truncate ${renderCellHighlight(selectedFilter === row.categoryName && filterType === "category")}`}
                    title={row.categoryName}
                    onClick={() => row.categoryName && handleDrillFilter(row, "category")}
                  >
                    {row.categoryName || "-"}
                  </TableCell>
                  <TableCell
                    className={`max-w-37.5 cursor-pointer truncate ${renderCellHighlight(selectedFilter === row.brandName && filterType === "brand")}`}
                    title={row.brandName}
                    onClick={() => row.brandName && handleDrillFilter(row, "brand")}
                  >
                    {row.brandName || "-"}
                  </TableCell>
                  <TableCell
                    className={`max-w-100 cursor-pointer truncate ${renderCellHighlight(selectedFilter === row.productName && filterType === "product")}`}
                    title={row.productName}
                    onClick={() => row.productName && handleDrillFilter(row, "product")}
                  >
                    {row.productName}
                  </TableCell>
                  <TableCell className="p-0 text-center">
                    <BarCell value={row.qtyOnHand || 0} max={maxQty} color="#e6f7ff" />
                  </TableCell>
                  <TableCell className="p-0 text-center">
                    <BarCell value={cp} max={maxCost} color="#f0f5ff" prefix="$" />
                  </TableCell>
                  <TableCell className="p-0 text-center">
                    <BarCell value={totalCost} max={maxTotalCost} color="#fff7e6" prefix="$" />
                  </TableCell>
                  <TableCell className="p-0 text-center">
                    <BarCell value={sp} max={maxUnitPrice} color="#f6ffed" prefix="$" />
                  </TableCell>
                  <TableCell className="text-center font-medium">{margin.toFixed(2)}%</TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      render={
                        <Link href={`/inventory-management/manage-inventories/edit/${row.inventoryId}`} />
                      }
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
      </div>
      <TablePagination
        page={productPagination.page}
        totalPages={productPagination.totalPages}
        totalEntries={productPagination.totalEntries}
        pageSize={PAGE_SIZE}
        loading={loading}
        onPageChange={(p) => fetchProducts(activeFilters, p)}
      />
      </div>
    );
  }

  function PackagesTable({ inModal = false }: { inModal?: boolean }) {
    return (
      <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className={inModal ? "h-[calc(100vh-105px)] overflow-auto" : "h-[calc(100vh-500px)] min-h-100 overflow-auto"}>
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead className="w-37.5 text-center">Expiry Date</TableHead>
              <TableHead className="w-100">Product</TableHead>
              <TableHead className="w-62.5">Metrc ID</TableHead>
              <TableHead className="w-62.5">Shop Name</TableHead>
              <TableHead className="w-25 text-center">Age</TableHead>
              <TableHead className="w-37.5 text-center">Qty On Hand</TableHead>
              <TableHead className="w-25 text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && packageRows.length === 0 &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`s-${i}`} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && packageRows.length === 0 && (
              <TableRow className="border-b-0">
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
                <TableRow key={row.packageId || i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                  <TableCell className="text-center">{row.expiryDate || "N/A"}</TableCell>
                  <TableCell className="max-w-100 truncate" title={row.productName}>
                    {row.productName}
                  </TableCell>
                  <TableCell className="max-w-62.5 truncate" title={row.advertisedId}>
                    {row.advertisedId}
                  </TableCell>
                  <TableCell className="max-w-62.5 truncate" title={row.shopName}>
                    {row.shopName}
                  </TableCell>
                  <TableCell className="text-center">{days == null ? "N/A" : `${days} day${days !== 1 ? "s" : ""}`}</TableCell>
                  <TableCell className="p-0 text-center">
                    <BarCell value={row.qtyOnHand || 0} max={maxPkgQty} color="#e6f7ff" />
                  </TableCell>
                  <TableCell className="text-center">
                    {row.inventoryId ? (
                      <Button
                        size="sm"
                        render={
                          <Link href={`/inventory-management/manage-inventories/edit/${row.inventoryId}`} />
                        }
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
      </div>
      <TablePagination
        page={packagePagination.page}
        totalPages={packagePagination.totalPages}
        totalEntries={packagePagination.totalEntries}
        pageSize={PAGE_SIZE}
        loading={loading}
        onPageChange={(p) => fetchPackages(activeFilters, p)}
      />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <Card className="gap-0 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ApiSelect placeholder="Category" value={categoryId} onChange={setCategoryId} fetchPage={fetchCategoryPage} />
          <ApiSelect placeholder="Brand" value={brandId} onChange={setBrandId} fetchPage={fetchBrandPage} />
          <ApiSelect placeholder="Product" value={productId} onChange={setProductId} fetchPage={fetchProductPage} />

          <Select value={marginMode} onValueChange={setMarginMode}>
            <SelectTrigger className="w-40">
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
                className="w-24"
              />
              <span className="text-muted-foreground">:</span>
              <Input
                type="number"
                placeholder="Max %"
                value={maxMarginPercent ?? ""}
                onChange={(e) => setMaxMarginPercent(e.target.value === "" ? null : Number(e.target.value))}
                className="w-24"
              />
            </>
          )}

          <Select value={isMJ} onValueChange={setIsMJ}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="MJ Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">MJ</SelectItem>
              <SelectItem value="false">Non-MJ</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={clearAllFilters}>
            Clear All
          </Button>
        </div>
      </Card>

      {selectedFilter && filterType && (
        <Card className="gap-0 border-l-3 border-l-blue-500 bg-blue-50 p-4 dark:bg-blue-950/20">
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

      <Card className="gap-0 p-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "products" | "packages")}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="products">Product List</TabsTrigger>
              <TabsTrigger value="packages">Packages List</TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="icon" title="Full Screen" onClick={() => setFullscreenTable(activeTab)}>
              <Maximize2 className="size-4" />
            </Button>
          </div>

          <TabsContent value="products" className="mt-2">
            <ProductsTable />
          </TabsContent>
          <TabsContent value="packages" className="mt-2">
            <PackagesTable />
          </TabsContent>
        </Tabs>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="gap-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Product Tag</h3>
            <TagIcon className="size-4 text-muted-foreground" />
          </div>
          <Input placeholder="Search" value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            {filteredTagRows.length} {filteredTagRows.length === 1 ? "record" : "records"}
          </p>
          <div className="relative max-h-75 overflow-auto rounded-xl ring-1 ring-foreground/10">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
                <TableRow className="bg-muted/60">
                  <TableHead>Top Tag</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTagRows.length === 0 && (
                  <TableRow className="border-b-0">
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No data
                    </TableCell>
                  </TableRow>
                )}
                {filteredTagRows.map((t, i) => (
                  <TableRow key={i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                    <TableCell>{t.topTag}</TableCell>
                    <TableCell className="text-right">${t.cost}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="gap-3 p-5">
          <h3 className="text-lg font-semibold">Brands</h3>
          <div className="relative max-h-75 overflow-auto rounded-xl ring-1 ring-foreground/10">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
                <TableRow className="bg-muted/60">
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">% Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brandRows.length === 0 && (
                  <TableRow className="border-b-0">
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No data
                    </TableCell>
                  </TableRow>
                )}
                {brandRows.map((b, i) => (
                  <TableRow key={i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                    <TableCell>{b.brand}</TableCell>
                    <TableCell className="text-right">{b.percentCost}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <Dialog open={fullscreenTable !== null} onOpenChange={(open) => !open && setFullscreenTable(null)}>
        <DialogContent className="h-screen w-screen max-w-none p-0" showCloseButton={false}>
          <DialogHeader className="flex-row items-center justify-between border-b p-4">
            <DialogTitle>{fullscreenTable === "products" ? "Product List" : "Packages List"}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setFullscreenTable(null)}>
              <Minimize2 className="size-4" />
            </Button>
          </DialogHeader>
          {fullscreenTable === "products" && <ProductsTable inModal />}
          {fullscreenTable === "packages" && <PackagesTable inModal />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
