"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { fetchSalesByEmployee } from "@/services/reporting/salesByEmployee";
import { fetchSingleShop } from "@/services/shops/getSingle";

import { Button } from "@/components/ui/button";
import { ApiSelect } from "@/components/ui/api-select";
import { DateRangeSelector, type SelectedDateResult } from "@/components/ui/date-range-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";
import ExcelExportDrawer from "@/components/ui/excel-export-drawer";

import {
  useShop,
  useShops,
  useCategoryPageFetcher,
  useProductPageFetcher,
  SalesByTable,
  SimpleSelect,
  DELIVERY_METHOD_OPTIONS,
  SOURCE_OPTIONS,
  money,
  pct,
} from "./salesByShared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  EMPLOYEE_SECTIONS,
  EMPLOYEE_COLUMN_CONFIG,
  buildEmployeeHtml,
  buildEmployeeExcelSheets,
  exportEmployeeToCsv,
} from "./exportConfig";
import type { SalesByEmployeeRow, ReportPagination } from "./types";

const PAGE_SIZE = 20;
const EXPORT_BATCH_SIZE = 100;

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function emptyPagination(): ReportPagination {
  return { page: 1, pageSize: PAGE_SIZE, totalEntries: 0, totalPages: 1 };
}

export default function SalesByEmployeeReport() {
  const { shopId: defaultShopId } = useShop();
  const shops = useShops();
  const fetchCategoryPage = useCategoryPageFetcher();
  const fetchProductPage = useProductPageFetcher();

  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({
    startDate: todayStr(),
    endDate: todayStr(),
    timeEnabled: false,
  });
  const [selectedShopId, setSelectedShopId] = useState<string | null>(defaultShopId ?? null);
  const [categoryId, setCategoryId] = useState<string | number | null>(null);
  const [productId, setProductId] = useState<string | number | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState("__all__");
  const [source, setSource] = useState("__all__");

  const [runReport, setRunReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SalesByEmployeeRow[]>([]);
  const [pagination, setPagination] = useState(emptyPagination());
  const [storeInfo, setStoreInfo] = useState<any>({});

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [exportRows, setExportRows] = useState<SalesByEmployeeRow[]>([]);
  const [exporting, setExporting] = useState(false);

  const startDate = selectedDate.startDate ?? todayStr();
  const endDate = selectedDate.endDate ?? startDate;
  const dateRangeLabel = `${format(new Date(startDate), "MMM dd, yyyy")} – ${format(new Date(endDate), "MMM dd, yyyy")}`;

  const buildFilters = (extra: Record<string, any> = {}) => {
    const filters: Record<string, any> = { startDate, endDate, ...extra };
    if (selectedShopId) filters.shopId = selectedShopId;
    if (categoryId) filters.categoryId = categoryId;
    if (productId) filters.productId = productId;
    if (deliveryMethod !== "__all__") filters.deliveryMethod = deliveryMethod;
    if (source !== "__all__") filters.source = source;
    return filters;
  };

  const fetchDetail = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await fetchSalesByEmployee(buildFilters({ page, limit: PAGE_SIZE }));
        setRows(res?.data?.data ?? []);
        const pd = res?.data?.paginationData;
        setPagination({
          page: pd?.currentPage || page,
          pageSize: PAGE_SIZE,
          totalEntries: pd?.totalEntries || 0,
          totalPages: pd?.totalPages || 1,
        });
      } catch (err: any) {
        toast.error(err?.message || "Failed to load sales by employee");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedShopId, startDate, endDate, categoryId, productId, deliveryMethod, source],
  );

  const handleRunReport = async () => {
    if (!storeInfo?.name && selectedShopId) {
      fetchSingleShop(selectedShopId).then((res) => setStoreInfo(res?.data || {}));
    }
    await fetchDetail(1);
    setRunReport(true);
  };

  const fetchAllForExport = async () => {
    const total = pagination.totalEntries || 0;
    const totalBatches = total > 0 ? Math.ceil(total / EXPORT_BATCH_SIZE) : 1;
    setExporting(true);
    const toastId = toast.loading(`Loading 0 / ${total} records...`);
    try {
      let fetched = 0;
      const all: SalesByEmployeeRow[] = [];
      for (let i = 0; i < totalBatches; i += 5) {
        const batchEnd = Math.min(i + 5, totalBatches);
        const pages = Array.from({ length: batchEnd - i }, (_, k) => i + k + 1);
        const results = await Promise.all(
          pages.map((page) => fetchSalesByEmployee(buildFilters({ page, limit: EXPORT_BATCH_SIZE }))),
        );
        results.forEach((res) => {
          const pageData = res?.data?.data || [];
          all.push(...pageData);
          fetched += pageData.length;
        });
        toast.loading(`Loading ${fetched} / ${total} records...`, { id: toastId });
      }
      toast.success(`Loaded ${all.length} records for export.`, { id: toastId });
      return all;
    } catch (err) {
      toast.error("Failed to fetch all data, using current page only.", { id: toastId });
      return rows;
    } finally {
      setExporting(false);
    }
  };

  const openPdf = async () => {
    setExportRows(await fetchAllForExport());
    setPdfOpen(true);
  };
  const openExcel = async () => {
    setExportRows(await fetchAllForExport());
    setExcelOpen(true);
  };
  const handleExportCsv = async () => {
    const all = await fetchAllForExport();
    exportEmployeeToCsv(all, dateRangeLabel, `sales_by_employee_${todayStr()}.csv`);
  };

  const exportMetadata = { storeName: storeInfo?.name || "Store", dateRange: dateRangeLabel };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Date Range</div>
          <DateRangeSelector
            setSelectedDate={setSelectedDate}
            initialDate={{ startDate: selectedDate.startDate, endDate: selectedDate.endDate }}
            showAllOption={false}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Shop</div>
          <Select
            items={[{ value: "__all__", label: "All Shops" }, ...shops.map((s) => ({ value: s.id, label: s.name }))]}
            value={selectedShopId ?? "__all__"}
            onValueChange={(v) => setSelectedShopId(v === "__all__" ? null : v)}
          >
            <SelectTrigger className="w-62.5">
              <SelectValue placeholder="All Shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Shops</SelectItem>
              {shops.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Category</div>
          <ApiSelect placeholder="All Categories" value={categoryId} onChange={setCategoryId} fetchPage={fetchCategoryPage} />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Products</div>
          <ApiSelect placeholder="All Products" value={productId} onChange={setProductId} fetchPage={fetchProductPage} />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Delivery Method</div>
          <SimpleSelect value={deliveryMethod} onValueChange={setDeliveryMethod} options={DELIVERY_METHOD_OPTIONS} className="w-62.5" />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Source</div>
          <SimpleSelect value={source} onValueChange={setSource} options={SOURCE_OPTIONS} className="w-62.5" />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 shrink-0" aria-hidden="true" />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" disabled={!runReport || exporting}>Export</Button>} />
            <DropdownMenuContent>
              <DropdownMenuItem onClick={openPdf}>Export to PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={openExcel}>Export to Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv}>Export to CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleRunReport} disabled={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {runReport && (
        <SalesByTable
          data={rows}
          loading={loading}
          pagination={pagination}
          onPageChange={(p) => fetchDetail(p)}
          rowKey={(r, i) => `${r.createdEmployeeName || r.employeeId}-${i}`}
          columns={[
            { key: "createdEmployeeName", label: "Employee", total: () => "TOTAL" },
            {
              key: "totalOrders",
              label: "Total Orders",
              align: "right",
              render: (r) => String(r.totalOrders ?? 0),
              total: (rows) => rows.reduce((s, r) => s + (r.totalOrders || 0), 0),
            },
            {
              key: "itemsSold",
              label: "Items Sold",
              align: "right",
              render: (r) => (r.itemsSold ?? 0).toFixed(2),
              total: (rows) => rows.reduce((s, r) => s + (r.itemsSold || 0), 0).toFixed(2),
            },
            {
              key: "grossSales",
              label: "Gross Sales",
              align: "right",
              render: (r) => money(r.grossSales),
              total: (rows) => money(rows.reduce((s, r) => s + (r.grossSales || 0), 0)),
            },
            {
              key: "totalDiscount",
              label: "Total Discount",
              align: "right",
              render: (r) => money(r.totalDiscount),
              total: (rows) => money(rows.reduce((s, r) => s + (r.totalDiscount || 0), 0)),
            },
            {
              key: "subtotal",
              label: "Subtotal",
              align: "right",
              render: (r) => money(r.subtotal),
              total: (rows) => money(rows.reduce((s, r) => s + (r.subtotal || 0), 0)),
            },
            {
              key: "totalCost",
              label: "Total Cost",
              align: "right",
              render: (r) => money(r.totalCost),
              total: (rows) => money(rows.reduce((s, r) => s + (r.totalCost || 0), 0)),
            },
            {
              key: "grossProfit",
              label: "Gross Profit",
              align: "right",
              render: (r) => money(r.grossProfit),
              total: (rows) => money(rows.reduce((s, r) => s + (r.grossProfit || 0), 0)),
            },
            {
              key: "grossMargin",
              label: "Gross Margin %",
              align: "right",
              render: (r) => pct(r.grossMargin),
              total: (rows) => {
                const gs = rows.reduce((s, r) => s + (r.grossSales || 0), 0);
                const gp = rows.reduce((s, r) => s + (r.grossProfit || 0), 0);
                return pct(gs > 0 ? (gp / gs) * 100 : 0);
              },
            },
            {
              key: "markdownPercent",
              label: "Markdown %",
              align: "right",
              render: (r) => pct(r.markdownPercent),
              total: (rows) => {
                const gs = rows.reduce((s, r) => s + (r.grossSales || 0), 0);
                const td = rows.reduce((s, r) => s + (r.totalDiscount || 0), 0);
                return pct(gs > 0 ? (td / gs) * 100 : 0);
              },
            },
            {
              key: "averageOrderValue",
              label: "Avg Order Value",
              align: "right",
              render: (r) => money(r.averageOrderValue),
              total: (rows) => {
                const withSales = rows.filter((r) => (r.grossSales || 0) > 0);
                const sum = withSales.reduce((s, r) => s + (r.averageOrderValue || 0), 0);
                return money(withSales.length > 0 ? sum / withSales.length : 0);
              },
            },
            {
              key: "avgItemsPerOrder",
              label: "Avg Items/Order",
              align: "right",
              render: (r) => (r.avgItemsPerOrder ?? 0).toFixed(2),
              total: (rows) => {
                const withSales = rows.filter((r) => (r.grossSales || 0) > 0);
                const sum = withSales.reduce((s, r) => s + (r.avgItemsPerOrder || 0), 0);
                return (withSales.length > 0 ? sum / withSales.length : 0).toFixed(2);
              },
            },
          ]}
        />
      )}

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={exportRows}
        metadata={exportMetadata}
        availableSections={EMPLOYEE_SECTIONS}
        htmlGenerator={buildEmployeeHtml as any}
        columnConfig={EMPLOYEE_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={exportRows}
        metadata={exportMetadata}
        availableSections={EMPLOYEE_SECTIONS}
        excelGenerator={buildEmployeeExcelSheets as any}
        columnConfig={EMPLOYEE_COLUMN_CONFIG}
        filename={`Sales_By_Employee_${todayStr()}`}
      />
    </div>
  );
}
