"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, Info, Loader2 } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { useShop } from "@/context/shop-context";
import { fetchInventoriesList } from "@/services/inventories/list";
import { checkIsOpenForSellableStores } from "@/services/inventories/checkOpenForSellable";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchPackagesList } from "@/services/packages/list";
import { fetchWeedmapsConfig } from "@/services/weedmaps/getConfigs";
import { fetchLeaflyConfig } from "@/services/leafly/getConfig";
import { refreshSaleCosts } from "@/services/sales/refreshSaleCosts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import Drawer from "@/components/ui/Drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import InventoryDetailsDrawer from "./InventoryDetailsDrawer";

const PAGE_SIZE = 30;

function healthColor(totalQuantity, threshold) {
  if (totalQuantity > threshold) return "bg-green-500";
  if (totalQuantity < threshold && threshold > 0) return "bg-yellow-500";
  if (totalQuantity <= 0 || threshold <= 0) return "bg-red-500";
  return "bg-gray-400";
}

function healthLabel(totalQuantity, threshold) {
  if (totalQuantity > threshold) return "Healthy";
  if (totalQuantity < threshold && threshold > 0) return "Low Stock";
  if (totalQuantity <= 0 || threshold <= 0) return "Out of Stock";
  return "Unknown";
}

function mapInventory(inventory) {
  return {
    id: inventory.id,
    productId: inventory.productId,
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
    weedmapProductId: inventory.weedmapProductId,
    isPushedToLeafly: inventory.isPushedToLeafly ?? false,
    projectQtyConversionRate: inventory.projectQtyConversionRate,
    projectQtyUomId: inventory.projectQtyUomId,
    projectQtyUomShortForm: inventory.projectQtyUomShortForm,
  };
}

const emptyFilters: {
  isActive: string | boolean;
  productProfile: string;
  isAssociatedWithWM: boolean;
  isPushedToLeafly: boolean;
} = {
  isActive: "",
  productProfile: "",
  isAssociatedWithWM: false,
  isPushedToLeafly: false,
};

export default function ManageInventoriesTable() {
  const router = useRouter();
  const { shopId } = useShop();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [isOpenForSellableStore, setIsOpenForSellableStore] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const searchDebounceRef = useRef(null);

  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeSearching, setBarcodeSearching] = useState(false);
  const barcodeDebounceRef = useRef(null);

  const [categoryId, setCategoryId] = useState(null);
  const [brandId, setBrandId] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);

  const [vmIntegrated, setVmIntegrated] = useState(false);
  const [leaflyIntegrated, setLeaflyIntegrated] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const [selectedInventoryId, setSelectedInventoryId] = useState(null);

  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [optimizeTab, setOptimizeTab] = useState("pricing");
  const [optimizeRange, setOptimizeRange] = useState<DateRange | undefined>();
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [optimizeProgress, setOptimizeProgress] = useState("");

  const loadInventories = useCallback(
    async (targetPage = 1) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = { limit: PAGE_SIZE, page: targetPage };
        if (search) params.search = search;
        if (categoryId) params.categoryIds = [categoryId];
        if (brandId) params.brandIds = [brandId];
        if (filters.isActive !== "") params.isActive = filters.isActive;
        if (filters.productProfile) params.productProfile = filters.productProfile;
        if (filters.isAssociatedWithWM) params.isAssociatedWithWM = true;
        if (filters.isPushedToLeafly) params.isPushedToLeafly = true;

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
    [shopId, search, categoryId, brandId, filters]
  );

  useEffect(() => {
    loadInventories(1);
  }, [shopId, search, categoryId, brandId, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      try {
        const sellableRes = await checkIsOpenForSellableStores(shopId);
        setIsOpenForSellableStore(sellableRes?.data?.data?.available ?? true);
      } catch {
        // handleApiError already surfaced/handled the failure (e.g. logout on 401).
      }

      try {
        const wmRes = await fetchWeedmapsConfig(shopId);
        const cfg = wmRes?.data?.data;
        setVmIntegrated(Boolean(cfg?.clientId || cfg?.merchantId || cfg?.menuId));
      } catch {
        setVmIntegrated(false);
      }

      try {
        const leaflyRes = await fetchLeaflyConfig(shopId);
        setLeaflyIntegrated(Boolean(leaflyRes?.data?.data?.menuIntegrationKey));
      } catch {
        setLeaflyIntegrated(false);
      }
    })();
  }, [shopId]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearch(value.trim()), 500);
  };

  const handleBarcodeSearch = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || !shopId) {
        setBarcodeSearching(false);
        return;
      }
      setBarcodeSearching(true);
      try {
        const res = await fetchPackagesList(shopId, {
          limit: 1,
          page: 1,
          isFinished: false,
          packageName: trimmed,
        });
        const pkg = res?.data?.[0];
        if (pkg?.inventoryId) {
          router.push(`/inventory-management/manage-inventories/edit/${pkg.inventoryId}`);
        } else if (pkg) {
          toast.error("Package is not associated with any inventory");
        } else {
          toast.error("No package found with this barcode");
        }
      } catch (err) {
        toast.error(err?.message || "Failed to search package");
      } finally {
        setBarcodeSearching(false);
        setBarcodeInput("");
      }
    },
    [shopId, router]
  );

  const onBarcodeChange = (value: string) => {
    setBarcodeInput(value);
    if (barcodeDebounceRef.current) clearTimeout(barcodeDebounceRef.current);
    barcodeDebounceRef.current = setTimeout(() => handleBarcodeSearch(value), 500);
  };

  const fetchCategoryPage = useCallback(async (pageNum: number, term: string) => {
    const res = await fetchCategoriesList({ page: pageNum, limit: 10, search: term } as any);
    return {
      items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const fetchBrandPage = useCallback(async (pageNum: number, term: string) => {
    const res = await fetchBrandsList({ page: pageNum, limit: 10, search: term } as any);
    return {
      items: (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const clearAllFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategoryId(null);
    setBrandId(null);
    setFilters(emptyFilters);
  };

  const hasActiveFilters =
    searchInput ||
    categoryId ||
    brandId ||
    filters.isActive !== "" ||
    filters.productProfile ||
    filters.isAssociatedWithWM ||
    filters.isPushedToLeafly;

  const fetchAllInventoryData = async () => {
    if (totalPages <= 1) return rows;
    let allData: any[] = [];
    for (let p = 1; p <= totalPages; p++) {
      const params: Record<string, any> = { limit: PAGE_SIZE, page: p };
      if (search) params.search = search;
      if (categoryId) params.categoryIds = [categoryId];
      if (brandId) params.brandIds = [brandId];
      if (filters.isActive !== "") params.isActive = filters.isActive;
      if (filters.productProfile) params.productProfile = filters.productProfile;
      try {
        const res = await fetchInventoriesList(shopId, params);
        const inventories = res?.data?.data?.inventories ?? [];
        allData = allData.concat(inventories.map(mapInventory));
      } catch {
        toast.warning(`Failed to fetch page ${p}, continuing`);
      }
    }
    return allData;
  };

  const exportToCSV = async () => {
    if (!rows.length) return toast.warning("No data available to export");
    setExporting(true);
    setExportProgress("Preparing export...");
    try {
      const allData = await fetchAllInventoryData();
      if (!allData.length) return toast.warning("No data found to export");

      const headers = [
        "Product Name",
        "Category",
        "Brand",
        "Total Quantity",
        "Unit Price",
        "Sellable Qty",
        "Sellable In Store",
        "Status",
        "Inventory Health",
      ];
      const csvRows = allData.map((item) =>
        [
          `"${item.name}"`,
          `"${item.category}"`,
          `"${item.brand}"`,
          `${item.totalQuantity} ${item.sellableUoMShortForm}`,
          `$${item.unitPrice}`,
          `${item.quantity} ${item.sellableUoMShortForm}`,
          `${item.sellableOnStore} ${item.sellableUoMShortForm}`,
          item.status ? "Active" : "Inactive",
          healthLabel(item.totalQuantity, item.threshold),
        ].join(",")
      );
      const csvContent = [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `inventory_data_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      toast.success(`CSV exported successfully (${allData.length} records)`);
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  };

  const exportToXLS = async () => {
    if (!rows.length) return toast.warning("No data available to export");
    setExporting(true);
    setExportProgress("Preparing export...");
    try {
      const allData = await fetchAllInventoryData();
      if (!allData.length) return toast.warning("No data found to export");

      setExportProgress("Generating Excel file...");
      const XLSX = await import("xlsx");
      const excelData = allData.map((item) => ({
        "Product Name": item.name,
        Category: item.category,
        Brand: item.brand,
        "Total Quantity": `${item.totalQuantity} ${item.sellableUoMShortForm}`,
        "Unit Price": `$${item.unitPrice}`,
        "Sellable Qty": `${item.quantity} ${item.sellableUoMShortForm}`,
        "Sellable In Store": `${item.sellableOnStore} ${item.sellableUoMShortForm}`,
        Status: item.status ? "Active" : "Inactive",
        "Inventory Health": healthLabel(item.totalQuantity, item.threshold),
      }));
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Data");
      XLSX.writeFile(workbook, `inventory_data_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(`Excel file exported successfully (${allData.length} records)`);
    } catch {
      toast.error("Failed to export Excel file");
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  };

  const exportToPDF = async () => {
    if (!rows.length) return toast.warning("No data available to export");
    setExporting(true);
    setExportProgress("Preparing export...");
    try {
      const allData = await fetchAllInventoryData();
      if (!allData.length) return toast.warning("No data found to export");

      setExportProgress("Generating PDF...");
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("Manage Inventories", 14, 15);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 21);

      autoTable(doc, {
        startY: 26,
        head: [
          [
            "Product Name",
            "Category",
            "Brand",
            "Total Qty",
            "Unit Price",
            "Sellable Qty",
            "Sellable In Store",
            "Status",
            "Health",
          ],
        ],
        body: allData.map((item) => [
          item.name,
          item.category,
          item.brand,
          `${item.totalQuantity} ${item.sellableUoMShortForm}`,
          `$${item.unitPrice}`,
          `${item.quantity} ${item.sellableUoMShortForm}`,
          `${item.sellableOnStore} ${item.sellableUoMShortForm}`,
          item.status ? "Active" : "Inactive",
          healthLabel(item.totalQuantity, item.threshold),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 41, 59] },
      });

      doc.save(`inventory_data_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success(`PDF exported successfully (${allData.length} records)`);
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  };

  const runOptimizeForDays = async (days: string[]) => {
    setOptimizeLoading(true);
    try {
      setOptimizeProgress(`Refreshing costs for ${days.length} day(s) in parallel...`);
      await Promise.all(
        days.map(async (day) => {
          try {
            await refreshSaleCosts(shopId, day);
          } catch {
            toast.warning(`Refresh cost/price failed for ${day}`);
          }
        })
      );
      setOptimizeProgress("Optimization Complete ✅");
      loadInventories(page);
      setTimeout(() => setOptimizeProgress(""), 5000);
    } catch (err) {
      toast.error(err?.message || "Failed to optimize");
    } finally {
      setOptimizeLoading(false);
    }
  };

  const optimizeEcommAvailability = async () => {
    if (!optimizeRange?.from || !optimizeRange?.to) {
      toast.warning("Please select a date range");
      return;
    }
    const diffDays = (optimizeRange.to.getTime() - optimizeRange.from.getTime()) / 86400000;
    if (diffDays > 31) {
      toast.warning("Date range cannot exceed 1 month");
      return;
    }
    const days: string[] = [];
    const current = new Date(optimizeRange.from);
    current.setHours(0, 0, 0, 0);
    const end = new Date(optimizeRange.to);
    end.setHours(0, 0, 0, 0);
    while (current <= end) {
      days.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    await runOptimizeForDays(days);
  };

  const optimizeEcommToday = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await runOptimizeForDays([today.toISOString().split("T")[0]]);
  };

  const closeOptimizeDrawer = () => {
    if (optimizeLoading) return;
    setOptimizeOpen(false);
    setOptimizeRange(undefined);
    setOptimizeProgress("");
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Inventory Management</span>
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-foreground">Manage Inventories</span>
        </div>
        <Button onClick={() => setOptimizeOpen(true)} disabled={loading || rows.length === 0}>
          Optimize
        </Button>
      </div>

      {!isOpenForSellableStore && (
        <div className="rounded-md border border-orange-400 bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
          It seems like you don&apos;t have any storage locations. Make sure you have at least
          one open sellable store to work with inventories. You can create one from &quot;Inventory
          Management &gt; Storage Locations &gt; Add Location&quot;.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-45"
        />

        <div className="relative w-64">
          <Input
            placeholder="Scan via barcode"
            value={barcodeInput}
            onChange={(e) => onBarcodeChange(e.target.value)}
            className={barcodeSearching ? "pr-8" : ""}
          />
          {barcodeSearching && (
            <Loader2 className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <Select
          value={filters.isActive === "" ? null : String(filters.isActive)}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, isActive: v === "all" ? "" : v === "true" }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Is Inventory Active" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.productProfile === "" ? null : filters.productProfile}
          onValueChange={(v) => setFilters((f) => ({ ...f, productProfile: v }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Package Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="REGULAR">REGULAR</SelectItem>
            <SelectItem value="CANNABIS">CANNABIS</SelectItem>
          </SelectContent>
        </Select>

        <ApiSelect
          placeholder="Select Brand"
          value={brandId}
          onChange={(v) => setBrandId(v)}
          fetchPage={fetchBrandPage}
        />

        <ApiSelect
          placeholder="Select Category"
          value={categoryId}
          onChange={(v) => setCategoryId(v)}
          fetchPage={fetchCategoryPage}
        />

        {vmIntegrated && (
          <div className="flex items-center gap-2 whitespace-nowrap" title="Show Weedmaps menu items only">
            <Switch
              checked={filters.isAssociatedWithWM}
              onCheckedChange={(v) => setFilters((f) => ({ ...f, isAssociatedWithWM: v }))}
            />
            <span className="text-sm text-muted-foreground">Weedmaps</span>
          </div>
        )}

        {leaflyIntegrated && (
          <div className="flex items-center gap-2 whitespace-nowrap" title="Show Leafly menu items only">
            <Switch
              checked={filters.isPushedToLeafly}
              onCheckedChange={(v) => setFilters((f) => ({ ...f, isPushedToLeafly: v }))}
            />
            <span className="text-sm text-muted-foreground">Leafly</span>
          </div>
        )}

        {hasActiveFilters && (
          <Button variant="outline" onClick={clearAllFilters}>
            Clear Filters
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {exportProgress && <span className="text-xs text-muted-foreground">{exportProgress}</span>}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button disabled={!rows.length || exporting}>
                  {exporting && <Loader2 className="animate-spin" />}
                  Export
                </Button>
              }
            />
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToCSV}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={exportToXLS}>Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        {loading && rows.length > 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead className="w-70">Product Name</TableHead>
              <TableHead className="text-center">Health</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-center">Total Qty</TableHead>
              <TableHead className="text-center">Unit Price</TableHead>
              <TableHead className="text-center">Sellable Qty</TableHead>
              <TableHead className="text-center">Sellable In Store</TableHead>
              <TableHead className="w-28 text-center">Status</TableHead>
              <TableHead className="sticky right-0 z-10 w-33 bg-muted text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.35)]">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && rows.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  No inventory items found.
                </TableCell>
              </TableRow>
            )}

            {rows.length > 0 &&
              rows.map((row, i) => (
                <TableRow key={row.id} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                  <TableCell className="max-w-70 truncate font-medium">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {row.weedmapProductId && (
                        <img
                          src="/images/vm.png"
                          alt="WM"
                          className="size-4 shrink-0 rounded-full border border-border object-contain"
                        />
                      )}
                      {row.isPushedToLeafly && (
                        <img
                          src="/images/leafly-logo.png"
                          alt="Leafly"
                          className="size-4 shrink-0 rounded-full border border-border object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedInventoryId(row.id)}
                        className="truncate text-left hover:underline"
                        title={row.name}
                      >
                        {row.name}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`mx-auto inline-block size-3 rounded-full ${healthColor(row.totalQuantity, row.threshold)}`}
                      title={healthLabel(row.totalQuantity, row.threshold)}
                    />
                  </TableCell>
                  <TableCell className="max-w-40 truncate" title={row.category}>{row.category}</TableCell>
                  <TableCell>{row.brand}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-medium">
                        {row.totalQuantity} {row.sellableUoMShortForm}
                      </span>
                      {row.projectQtyUomId &&
                        Number(row.projectQtyConversionRate) > 0 &&
                        row.projectQtyUomShortForm && (
                          <div className="flex flex-col items-center text-xs">
                            <span className="text-muted-foreground">↓</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {(row.totalQuantity / row.projectQtyConversionRate).toFixed(2)}{" "}
                              {row.projectQtyUomShortForm}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              (Rate: {row.projectQtyConversionRate})
                            </span>
                          </div>
                        )}
                    </div>
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
                    className={`sticky right-0 z-10 w-33 text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.35)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : "bg-background"}`}
                  >
                    <Button
                      size="sm"
                      onClick={() => router.push(`/inventory-management/manage-inventories/edit/${row.id}`)}
                    >
                      Edit Pricing
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        totalEntries={totalEntries}
        pageSize={PAGE_SIZE}
        loading={loading}
        onPageChange={loadInventories}
      />

      <Drawer open={optimizeOpen} onClose={closeOptimizeDrawer} side="right" size={480}>
        <div className="flex h-full flex-col">
          <div className="border-b px-5 py-4 text-base font-semibold">Optimize</div>
          <div className="flex-1 overflow-y-auto p-5">
            <Tabs value={optimizeTab} onValueChange={(v) => setOptimizeTab(v as string)}>
              <TabsList>
                <TabsTrigger value="pricing">Optimize Pricing</TabsTrigger>
                <TabsTrigger value="optimize">Optimize</TabsTrigger>
              </TabsList>

              <TabsContent value="pricing">
                <div className="flex flex-col gap-5 pt-4">
                  <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                    <Info className="mt-0.5 size-4 shrink-0 text-blue-500" />
                    <div>
                      <p className="mb-1 text-sm font-medium text-blue-800 dark:text-blue-300">
                        What does this do?
                      </p>
                      <p className="text-sm leading-relaxed text-blue-700 dark:text-blue-400">
                        This will re-sync the <strong>cost/price</strong> for all products on the
                        server for each day in the selected date range. Use this when product
                        pricing has been updated in your system.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Date Range <span className="font-normal text-muted-foreground">(max 1 month)</span>
                    </label>
                    <Popover>
                      <PopoverTrigger
                        className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                        disabled={optimizeLoading}
                      >
                        {optimizeRange?.from && optimizeRange?.to
                          ? `${optimizeRange.from.toLocaleDateString()} - ${optimizeRange.to.toLocaleDateString()}`
                          : <span className="text-muted-foreground">Select date range</span>}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={optimizeRange}
                          onSelect={(range) => {
                            if (range?.from && range?.to) {
                              const diffDays = (range.to.getTime() - range.from.getTime()) / 86400000;
                              if (diffDays > 31) {
                                toast.warning("Date range cannot exceed 1 month");
                                return;
                              }
                            }
                            setOptimizeRange(range);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Costs will be refreshed in parallel for every day in the selected range.
                    </p>
                  </div>

                  <div className="h-px bg-border" />

                  {optimizeProgress ? (
                    <div
                      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                        optimizeProgress.includes("✅")
                          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
                          : "border-border bg-muted/50"
                      }`}
                    >
                      {optimizeLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                      <span
                        className={`text-sm font-medium ${
                          optimizeProgress.includes("✅") ? "text-green-700 dark:text-green-400" : "text-muted-foreground"
                        }`}
                      >
                        {optimizeProgress}
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
                      No refresh in progress. Select a date range and click <strong>Refresh Costs</strong> to begin.
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="optimize">
                <div className="flex flex-col gap-4 pt-4">
                  <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
                    <div>
                      <p className="mb-1 text-sm font-semibold">Update & Optimise</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Click this button if you&apos;d like to optimize your products with your
                        ecommerce store.
                      </p>
                    </div>
                    <Button className="w-fit" onClick={optimizeEcommToday} disabled={optimizeLoading}>
                      {optimizeLoading && <Loader2 className="animate-spin" />}
                      {optimizeLoading ? "Optimising..." : "Optimise"}
                    </Button>
                    {optimizeProgress && (
                      <div
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                          optimizeProgress.includes("✅")
                            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400"
                            : "border-border bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        {optimizeLoading && <Loader2 className="size-3.5 animate-spin" />}
                        {optimizeProgress}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          {optimizeTab === "pricing" && (
            <div className="flex justify-end gap-2 border-t bg-muted/30 p-4">
              <Button variant="outline" onClick={closeOptimizeDrawer} disabled={optimizeLoading}>
                Cancel
              </Button>
              <Button
                onClick={optimizeEcommAvailability}
                disabled={!optimizeRange?.from || !optimizeRange?.to || optimizeLoading}
              >
                {optimizeLoading ? "Refreshing..." : "Refresh Costs"}
              </Button>
            </div>
          )}
        </div>
      </Drawer>

      <InventoryDetailsDrawer
        inventoryId={selectedInventoryId}
        onClose={() => setSelectedInventoryId(null)}
      />
    </div>
  );
}
