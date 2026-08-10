"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, ChevronsUpDown, Info, Loader2 } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { useShop } from "@/context/shop-context";
import { fetchInventoriesList } from "@/services/inventories/list";
import { checkIsOpenForSellableStores } from "@/services/inventories/checkOpenForSellable";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchPackagesList } from "@/services/packages/list";
import { fetchWeedmapsConfig } from "@/services/weedmaps/getConfigs";
import { fetchStorageLocations } from "@/services/storageLocations/list";
import { fetchLeaflyConfig } from "@/services/leafly/getConfig";
import { refreshSaleCosts } from "@/services/sales/refreshSaleCosts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import BulkEditDrawer from "@/app/catalog/products/BulkEditDrawer";
import MergeProductsDrawer from "@/app/catalog/products/MergeProductsDrawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import InventoryDetailsDrawer from "./InventoryDetailsDrawer";
import { useSettings } from "@/context/settings-context";

const PAGE_SIZE_OPTIONS = [30, 50, 100, 200];

function healthColor(totalQuantity, threshold) {
  if (totalQuantity > threshold) return "bg-[#497E05]";
  if (totalQuantity < threshold && threshold > 0) return "bg-yellow-500";
  if (totalQuantity <= 0 || threshold <= 0) return "bg-[#DE4B10]";
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
    unitPrice: inventory.unitPrice,
    totalQuantity: inventory.totalQuantity,
    threshold: inventory.thresholdStock,
    category: inventory?.category?.name ?? "N/A",
    brand: inventory?.brand?.name ?? "N/A",
    weedmapProductId: inventory.weedmapProductId,
    isPushedToLeafly: inventory.isPushedToLeafly ?? false,
    storageLocations: (inventory.storageLocations ?? []).map((location) => ({
      id: location.id,
      name: location.name,
      quantity: location.quantity,
      value: location.value,
    })),
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
  const { defaultPageSize } = useSettings();
  const router = useRouter();
  const { shopId } = useShop();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [isOpenForSellableStore, setIsOpenForSellableStore] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const searchDebounceRef = useRef(null);

  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeSearching, setBarcodeSearching] = useState(false);
  const barcodeDebounceRef = useRef(null);

  const [categoryId, setCategoryId] = useState(null);
  const [brandId, setBrandId] = useState(null);
  const [storageLocationId, setStorageLocationId] = useState(null);
  const [storageLocationOptions, setStorageLocationOptions] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);

  const [sortByAlpha, setSortByAlpha] = useState(0);
  const [sortByPrice, setSortByPrice] = useState(0);
  const [sortByValue, setSortByValue] = useState(0);

  const [vmIntegrated, setVmIntegrated] = useState(false);
  const [leaflyIntegrated, setLeaflyIntegrated] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const [detailsInventoryId, setDetailsInventoryId] = useState(null);

  const [selectedRows, setSelectedRows] = useState([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeList, setMergeList] = useState([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [optimizeTab, setOptimizeTab] = useState("pricing");
  const [optimizeRange, setOptimizeRange] = useState<DateRange | undefined>();
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [optimizeProgress, setOptimizeProgress] = useState("");

  const loadInventories = useCallback(
    async (targetPage = 1, size = pageSize) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = { limit: size, page: targetPage };
        if (search) params.search = search;
        if (categoryId) params.categoryIds = [categoryId];
        if (brandId) params.brandIds = [brandId];
        if (storageLocationId) params.filterByStorageLocationId = storageLocationId;
        if (filters.isActive !== "") params.isActive = filters.isActive;
        if (filters.productProfile) params.productProfile = filters.productProfile;
        if (filters.isAssociatedWithWM) params.isAssociatedWithWM = true;
        if (filters.isPushedToLeafly) params.isPushedToLeafly = true;
        if (sortByAlpha) params.sortByAlpha = sortByAlpha;
        if (sortByPrice) params.sortByPrice = sortByPrice;

        const res = await fetchInventoriesList(shopId, params);
        const inventories = res?.data?.data?.inventories ?? [];
        setRows(inventories.map(mapInventory));

        const pagination = res?.data?.data?.paginationData;
        if (pagination) {
          setTotalPages(pagination.totalPages ?? 1);
          setTotalEntries(pagination.totalEntries ?? inventories.length);
        }
        setPage(targetPage);
        setSelectedRows([]);
      } catch (err) {
        toast.error(err?.message || "Failed to load inventory list");
      } finally {
        setLoading(false);
      }
    },
    [shopId, search, categoryId, brandId, storageLocationId, filters, sortByAlpha, sortByPrice, pageSize]
  );

  useEffect(() => {
    loadInventories(1);
  }, [shopId, search, categoryId, brandId, storageLocationId, filters, sortByAlpha, sortByPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      try {
        const res = await fetchStorageLocations(shopId);
        setStorageLocationOptions(res?.data?.data?.locations ?? []);
      } catch {
        setStorageLocationOptions([]);
      }
    })();
  }, [shopId]);

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
          router.push(`/inventory-management/inventory-and-pricing/edit/${pkg.inventoryId}`);
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

  const toProductRow = (row: any) => ({
    id: row.productId,
    name: row.name,
    brand: row.brand && row.brand !== "N/A" ? { id: row.brand, name: row.brand } : null,
  });

  const isRowSelected = (id: string) => selectedRows.some((r: any) => r.id === id);

  const toggleRow = (row: any, checked: boolean) => {
    setSelectedRows((prev: any) => {
      const byId = new Map(prev.map((r: any) => [r.id, r]));
      if (checked) byId.set(row.id, row);
      else byId.delete(row.id);
      return Array.from(byId.values());
    });
  };

  const toggleAllRows = (checked: boolean) => {
    setSelectedRows((prev: any) => {
      const byId = new Map(prev.map((r: any) => [r.id, r]));
      rows.forEach((row: any) => {
        if (checked) byId.set(row.id, row);
        else byId.delete(row.id);
      });
      return Array.from(byId.values());
    });
  };

  const toggleSortByAlpha = () => {
    setSortByPrice(0);
    setSortByValue(0);
    setSortByAlpha((prev) => (prev === 1 ? -1 : 1));
  };

  const toggleSortByPrice = () => {
    setSortByAlpha(0);
    setSortByValue(0);
    setSortByPrice((prev) => (prev === 1 ? -1 : 1));
  };

  const toggleSortByValue = () => {
    setSortByAlpha(0);
    setSortByPrice(0);
    setSortByValue((prev) => (prev === 1 ? -1 : 1));
  };

  const clearAllFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategoryId(null);
    setBrandId(null);
    setStorageLocationId(null);
    setFilters(emptyFilters);
  };

  const totalValue = (row: any) => row.storageLocations.reduce((sum: number, l: any) => sum + l.value, 0);

  const displayRows = useMemo(() => {
    if (!sortByValue) return rows;
    return [...rows].sort((a: any, b: any) => (totalValue(a) - totalValue(b)) * sortByValue);
  }, [rows, sortByValue]);

  const hasActiveFilters =
    searchInput ||
    categoryId ||
    brandId ||
    storageLocationId ||
    filters.isActive !== "" ||
    filters.productProfile ||
    filters.isAssociatedWithWM ||
    filters.isPushedToLeafly;

  const fetchAllInventoryData = async () => {
    if (totalPages <= 1) return rows;
    let allData: any[] = [];
    for (let p = 1; p <= totalPages; p++) {
      const params: Record<string, any> = { limit: pageSize, page: p };
      if (search) params.search = search;
      if (categoryId) params.categoryIds = [categoryId];
      if (brandId) params.brandIds = [brandId];
      if (storageLocationId) params.filterByStorageLocationId = storageLocationId;
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

      const headers = ["Product Name", "Category", "Brand", "Unit Price", "Storage Locations"];
      const csvRows = allData.map((item) =>
        [
          `"${item.name}"`,
          `"${item.category}"`,
          `"${item.brand}"`,
          `$${item.unitPrice}`,
          `"${item.storageLocations.map((l) => `${l.name}: ${l.quantity} ($${l.value.toFixed(2)})`).join("; ")}"`,
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
        "Unit Price": `$${item.unitPrice}`,
        "Storage Locations": item.storageLocations.map((l) => `${l.name}: ${l.quantity} ($${l.value.toFixed(2)})`).join("; "),
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
        head: [["Product Name", "Category", "Brand", "Unit Price", "Storage Locations"]],
        body: allData.map((item) => [
          item.name,
          item.category,
          item.brand,
          `$${item.unitPrice}`,
          item.storageLocations.map((l) => `${l.name}: ${l.quantity} ($${l.value.toFixed(2)})`).join("; "),
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
    <div className="p-6">
    <div className="flex flex-col gap-4 rounded-xl bg-card p-6 shadow-md">
      <div className="-mx-6 flex items-center justify-between border-b border-border/70 px-6 pb-4">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Inventory Management</span>
          <ChevronRight className="size-3.5" />
          <span className="font-normal text-primary">Manage Inventories</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="h-9! rounded! px-3.5! text-[14px]! font-normal!"
            onClick={() => setOptimizeOpen(true)}
            disabled={loading || rows.length === 0}
          >
            Optimize
          </Button>
          {selectedRows.length > 0 && (
            <>
              <Button
                variant="outline"
                className="h-9! rounded! px-3.5! text-[14px]! font-normal!"
                onClick={() => {
                  setMergeList(selectedRows.map(toProductRow));
                  setMergeOpen(true);
                }}
              >
                Merge ({selectedRows.length} product{selectedRows.length === 1 ? "" : "s"} selected)
              </Button>
              <Button
                variant="outline"
                className="h-9! rounded! px-3.5! text-[14px]! font-normal!"
                onClick={() => setBulkEditOpen(true)}
              >
                Bulk Edit ({selectedRows.length} product{selectedRows.length === 1 ? "" : "s"} selected)
              </Button>
            </>
          )}
        </div>
      </div>

      {!isOpenForSellableStore && (
        <div className="rounded-md border border-orange-400 bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
          It seems like you don&apos;t have any storage locations. Make sure you have at least
          one open sellable store to work with inventories. You can create one from &quot;Inventory
          Management &gt; Storage Locations &gt; Add Location&quot;.
        </div>
      )}

      <div className="-ml-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-9 w-45"
        />

        <div className="relative w-64">
          <Input
            placeholder="Scan via barcode"
            value={barcodeInput}
            onChange={(e) => onBarcodeChange(e.target.value)}
            className={`h-9 ${barcodeSearching ? "pr-8" : ""}`}
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
          <SelectTrigger className="h-9! w-40">
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
          <SelectTrigger className="h-9! w-40">
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
          triggerClassName="h-9"
        />

        <ApiSelect
          placeholder="Select Category"
          value={categoryId}
          onChange={(v) => setCategoryId(v)}
          fetchPage={fetchCategoryPage}
          triggerClassName="h-9"
        />

        <Select
          value={storageLocationId ?? "all"}
          onValueChange={(v) => setStorageLocationId(v === "all" ? null : v)}
        >
          <SelectTrigger className="h-9! w-45">
            <SelectValue placeholder="Select Location">
              {(value: string) =>
                value === "all"
                  ? "All Storage Locations"
                  : storageLocationOptions.find((l: any) => l.id === value)?.name ?? "Select Location"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Storage Locations</SelectItem>
            {storageLocationOptions.map((location: any) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        {exportProgress && <span className="text-xs text-muted-foreground">{exportProgress}</span>}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button className="h-9! rounded! px-3.5! text-[14px]! font-normal!" disabled={!rows.length || exporting}>
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

        {hasActiveFilters && (
          <Button variant="outline" onClick={clearAllFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      <div className="relative -mx-6 overflow-hidden ring-1 ring-foreground/10">
        {loading && rows.length > 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <Table className="table-fixed">
          <TableHeader className="[&_tr]:border-b-0 [&_th]:h-14">
            <TableRow className="bg-muted/60">
              <TableHead className="w-[3%] pl-3">
                <Checkbox
                  className="rounded-md"
                  checked={rows.length > 0 && rows.every((row: any) => isRowSelected(row.id))}
                  onCheckedChange={(checked) => toggleAllRows(!!checked)}
                />
              </TableHead>
              <TableHead className="w-[18%] pl-1">
                <button className="flex items-center gap-1 hover:text-foreground" onClick={toggleSortByAlpha}>
                  Product Name <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead className="w-[11%]">Category</TableHead>
              <TableHead className="w-[11%]">Brand</TableHead>
              <TableHead className="w-[9%] text-center">
                <button className="mx-auto flex items-center gap-1 hover:text-foreground" onClick={toggleSortByPrice}>
                  Unit Price <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead className="w-[14%]">Storage Locations</TableHead>
              <TableHead className="w-[9%]">
                <button className="flex items-center gap-1 hover:text-foreground" onClick={toggleSortByValue}>
                  Value <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead className="w-[9%] text-center">Status</TableHead>
              <TableHead className="w-[8%] text-center">Health</TableHead>
              <TableHead className="w-[8%] text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-foreground/70 [&_td]:py-3.5">
            {loading && rows.length === 0 &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
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

            {displayRows.length > 0 &&
              displayRows.map((row: any, i) => (
                <TableRow key={row.id} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                  <TableCell className="pl-3">
                    <Checkbox className="rounded-md" checked={isRowSelected(row.id)} onCheckedChange={(checked) => toggleRow(row, !!checked)} />
                  </TableCell>
                  <TableCell className="max-w-70 truncate pl-1 font-normal">
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
                        onClick={() => setDetailsInventoryId(row.id)}
                        className="truncate text-left text-primary hover:underline"
                        title={row.name}
                      >
                        {row.name}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-40 truncate" title={row.category}>{row.category}</TableCell>
                  <TableCell>{row.brand}</TableCell>
                  <TableCell className="text-center">${row.unitPrice}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.storageLocations.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {row.storageLocations.map((location: any) => (
                          <span key={location.id}>
                            {location.name}: {location.quantity}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.storageLocations.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {row.storageLocations.map((location: any) => (
                          <span key={location.id}>${location.value.toFixed(2)}</span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="w-28 text-center">
                    <span
                      className={`mx-auto inline-block size-3 rounded-full ${row.status ? "bg-[#497E05]" : "bg-[#DE4B10]"}`}
                      title={row.status ? "Active" : "Inactive"}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`mx-auto inline-block size-3 rounded-full ${healthColor(row.totalQuantity, row.threshold)}`}
                      title={healthLabel(row.totalQuantity, row.threshold)}
                    />
                  </TableCell>
                  <TableCell
                    className={`sticky right-0 z-10 w-33 text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.35)] ${i % 2 === 1 ? "bg-table-zebra" : "bg-background"}`}
                  >
                    <Button
                      className="h-9! rounded! px-3.5! text-[14px]! font-normal!"
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
        pageSize={pageSize}
        loading={loading}
        onPageChange={loadInventories}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={(s) => {
          setPageSize(s);
          loadInventories(1, s);
        }}
      />
    </div>

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

      <InventoryDetailsDrawer inventoryId={detailsInventoryId} onClose={() => setDetailsInventoryId(null)} />

      <MergeProductsDrawer
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        mergeList={mergeList}
        onRemove={(id) => {
          setMergeList((prev: any) => prev.filter((p: any) => p.id !== id));
          setSelectedRows((prev: any) => prev.filter((r: any) => r.productId !== id));
        }}
        onMerged={() => {
          setMergeOpen(false);
          setMergeList([]);
          setSelectedRows([]);
          loadInventories(page);
        }}
      />

      <BulkEditDrawer
        open={bulkEditOpen}
        onClose={() => setBulkEditOpen(false)}
        selectedProducts={selectedRows.map(toProductRow)}
        onSaved={() => {
          setBulkEditOpen(false);
          setSelectedRows([]);
          loadInventories(page);
        }}
      />
    </div>
  );
}
