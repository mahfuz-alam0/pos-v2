"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { fetchProductSales } from "@/services/reporting/productSales";
import { fetchSingleShop } from "@/services/shops/getSingle";
import { listAllDeals } from "@/services/sales/listDeals";
import { listAllCoupons } from "@/services/sales/listCoupons";

import { Button } from "@/components/ui/button";
import { ApiSelect } from "@/components/ui/api-select";
import { DateRangeSelector, type SelectedDateResult } from "@/components/ui/date-range-selector";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";
import ExcelExportDrawer from "@/components/ui/excel-export-drawer";

import {
  useShop,
  useCategoryPageFetcher,
  useBrandPageFetcher,
  SimpleSelect,
  DELIVERY_METHOD_OPTIONS,
  SOURCE_OPTIONS,
  money,
} from "./salesByShared";
import {
  ITEMIZED_SECTIONS,
  ITEMIZED_COLUMN_CONFIG,
  buildItemizedHtml,
  buildItemizedExcelSheets,
  exportItemizedToCsv,
} from "./exportConfig";
import type { ItemizedSaleRow, ReportPagination } from "./types";

const PAGE_SIZE = 20;
const EXPORT_BATCH_SIZE = 100;

const DISCOUNT_SOURCE_TYPE_OPTIONS = [
  { value: "__all__", label: "All Discount Types" },
  { value: "DEAL", label: "Deal" },
  { value: "COUPON", label: "Coupon" },
  { value: "LOYALTY_POINTS", label: "Loyalty Points" },
  { value: "CUSTOMER_TYPE", label: "Customer Type" },
  { value: "MISCELLANEOUS", label: "Miscellaneous" },
  { value: "MANUAL_LINE_ITEM_DISCOUNT", label: "Manual Line Item Discount" },
  { value: "TIERED_PRICING", label: "Tiered Pricing" },
];

const DELIVERY_METHOD_LABEL: Record<string, string> = { IN_STORE: "In Store", DELIVERY: "Delivery", PICK_UP: "Pick Up" };
const SOURCE_LABEL: Record<string, string> = { POS: "POS", ECOM: "E-Commerce", WEEDMAPS: "Weedmaps" };

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function emptyPagination(): ReportPagination {
  return { page: 1, pageSize: PAGE_SIZE, totalEntries: 0, totalPages: 1 };
}

export default function ItemizedSalesReport() {
  const { shopId } = useShop();
  const fetchCategoryPage = useCategoryPageFetcher();
  const fetchBrandPage = useBrandPageFetcher();

  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({
    startDate: todayStr(),
    endDate: todayStr(),
    timeEnabled: false,
  });
  const [categoryId, setCategoryId] = useState<string | number | null>(null);
  const [brandId, setBrandId] = useState<string | number | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState("__all__");
  const [source, setSource] = useState("__all__");
  const [discountSourceType, setDiscountSourceType] = useState("__all__");
  const [dealId, setDealId] = useState<string | number | null>(null);
  const [couponId, setCouponId] = useState<string | number | null>(null);

  const [deals, setDeals] = useState<{ id: string; name: string }[]>([]);
  const [coupons, setCoupons] = useState<{ id: string; name: string }[]>([]);

  const [runReport, setRunReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ItemizedSaleRow[]>([]);
  const [pagination, setPagination] = useState(emptyPagination());
  const [storeInfo, setStoreInfo] = useState<any>({});

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [exportRows, setExportRows] = useState<ItemizedSaleRow[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    listAllDeals().then((res) => setDeals(res?.data?.data?.deals ?? []));
    listAllCoupons().then((res) => setCoupons(res?.data?.data?.coupons ?? []));
  }, [shopId]);

  const startDate = selectedDate.startDate ?? todayStr();
  const endDate = selectedDate.endDate ?? startDate;
  const dateRangeLabel = `${format(new Date(startDate), "MMM dd, yyyy")} – ${format(new Date(endDate), "MMM dd, yyyy")}`;

  const buildFilters = (extra: Record<string, any> = {}) => {
    const filters: Record<string, any> = { startDate, endDate, ...extra };
    if (shopId) filters.shopId = shopId;
    if (categoryId) filters.categoryId = categoryId;
    if (brandId) filters.brandId = brandId;
    if (deliveryMethod !== "__all__") filters.deliveryMethod = deliveryMethod;
    if (source !== "__all__") filters.source = source;
    if (discountSourceType !== "__all__") filters.discountSourceType = discountSourceType;
    if (dealId) filters.dealId = dealId;
    if (couponId) filters.couponId = couponId;
    return filters;
  };

  const fetchDetail = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await fetchProductSales(buildFilters({ page, limit: PAGE_SIZE }));
        setRows(res?.data?.data ?? []);
        const pd = res?.data?.paginationData;
        setPagination({
          page: pd?.currentPage || page,
          pageSize: PAGE_SIZE,
          totalEntries: pd?.totalEntries || 0,
          totalPages: pd?.totalPages || 1,
        });
      } catch (err: any) {
        toast.error(err?.message || "Failed to load itemized sales");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shopId, startDate, endDate, categoryId, brandId, deliveryMethod, source, discountSourceType, dealId, couponId],
  );

  const handleRunReport = async () => {
    if (!storeInfo?.name && shopId) {
      fetchSingleShop(shopId).then((res) => setStoreInfo(res?.data || {}));
    }
    await fetchDetail(1);
    setRunReport(true);
  };

  useEffect(() => {
    handleRunReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, startDate, endDate, categoryId, brandId, deliveryMethod, source, discountSourceType, dealId, couponId]);

  const fetchAllForExport = async () => {
    const total = pagination.totalEntries || 0;
    const totalBatches = total > 0 ? Math.ceil(total / EXPORT_BATCH_SIZE) : 1;
    setExporting(true);
    const toastId = toast.loading(`Loading 0 / ${total} records...`);
    try {
      let fetched = 0;
      const all: ItemizedSaleRow[] = [];
      for (let i = 0; i < totalBatches; i += 5) {
        const batchEnd = Math.min(i + 5, totalBatches);
        const pages = Array.from({ length: batchEnd - i }, (_, k) => i + k + 1);
        const results = await Promise.all(
          pages.map((page) => fetchProductSales(buildFilters({ page, limit: EXPORT_BATCH_SIZE }))),
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
    exportItemizedToCsv(all, dateRangeLabel, `itemized_sales_${todayStr()}.csv`);
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
            className="w-62.5"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Categories</div>
          <ApiSelect placeholder="All Categories" value={categoryId} onChange={setCategoryId} fetchPage={fetchCategoryPage} triggerClassName="w-62.5" />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Brands</div>
          <ApiSelect placeholder="All Brands" value={brandId} onChange={setBrandId} fetchPage={fetchBrandPage} triggerClassName="w-62.5" />
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
          <div className="w-52 text-sm">Discount Source Type</div>
          <SimpleSelect value={discountSourceType} onValueChange={setDiscountSourceType} options={DISCOUNT_SOURCE_TYPE_OPTIONS} className="w-62.5" />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Deal</div>
          <ApiSelect
            placeholder="All Deals"
            value={dealId}
            onChange={setDealId}
            triggerClassName="w-62.5"
            fetchPage={useCallback(
              async (_page: number, search: string) => ({
                items: deals.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())),
                totalPages: 1,
              }),
              [deals],
            )}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Coupon</div>
          <ApiSelect
            placeholder="All Coupons"
            value={couponId}
            onChange={setCouponId}
            triggerClassName="w-62.5"
            fetchPage={useCallback(
              async (_page: number, search: string) => ({
                items: coupons.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
                totalPages: 1,
              }),
              [coupons],
            )}
          />
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
        <div className="flex flex-col gap-3">
          <div
            className="overflow-auto rounded-xl ring-1 ring-foreground/10 *:data-[slot=table-container]:overflow-visible"
            style={{ maxHeight: "calc(100vh - 420px)" }}
          >
            <Table>
              <TableHeader>
                <TableRow className="border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                  <TableHead>Product Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Package Name</TableHead>
                  <TableHead>Package ID</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Final Total</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Delivery Method</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={19} className="py-8 text-center text-muted-foreground">
                      No data available. Please run the report to see results.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r, i) => (
                  <TableRow
                    key={`${r.saleId}-${i}`}
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : "bg-background"}`}
                  >
                    <TableCell className="max-w-40 truncate">{r.productName || "-"}</TableCell>
                    <TableCell>{r.timeOfSale ? format(new Date(r.timeOfSale), "yyyy-MM-dd") : "-"}</TableCell>
                    <TableCell>{r.timeOfSale ? format(new Date(r.timeOfSale), "HH:mm:ss") : "-"}</TableCell>
                    <TableCell>{r.brandName && r.brandName !== "N/A" ? r.brandName : "-"}</TableCell>
                    <TableCell>{r.categoryName || "-"}</TableCell>
                    <TableCell className="max-w-32 truncate">{r.packageName || "-"}</TableCell>
                    <TableCell>{r.advertisedPackageId || "-"}</TableCell>
                    <TableCell className="text-right">{money(r.unitCost)}</TableCell>
                    <TableCell className="text-right">{money(r.unitPrice)}</TableCell>
                    <TableCell className="text-right">{(r.quantitySold ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{r.unitOfMeasurement || "-"}</TableCell>
                    <TableCell className="text-right">{money(r.totalCost)}</TableCell>
                    <TableCell className="text-right">
                      {Array.isArray(r.discountBreakdown) && r.discountBreakdown.length > 0 ? (
                        <Tooltip>
                          <TooltipTrigger className="underline decoration-dotted">{money(r.discountAmount)}</TooltipTrigger>
                          <TooltipContent className="max-w-64">
                            <div className="flex flex-col gap-1 text-left">
                              {r.discountBreakdown.map((d, di) => (
                                <div key={di}>
                                  {d.type || "-"}
                                  {d.name ? ` · ${d.name}` : ""} ·{" "}
                                  {d.discountRateType === "PERCENTAGE" ? `${(d.discountRate ?? 0).toFixed(2)}%` : money(d.discountRate)} ·{" "}
                                  {money(d.discountAmountDollars)}
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        money(r.discountAmount)
                      )}
                    </TableCell>
                    <TableCell className="text-right">{money(r.taxAmount)}</TableCell>
                    <TableCell className="text-right font-medium">{money(r.finalTotalPrice)}</TableCell>
                    <TableCell>{r.customerName || "-"}</TableCell>
                    <TableCell>{r.employeeName || "-"}</TableCell>
                    <TableCell>{(r.deliveryMethod && DELIVERY_METHOD_LABEL[r.deliveryMethod]) || r.deliveryMethod || "-"}</TableCell>
                    <TableCell>{(r.source && SOURCE_LABEL[r.source]) || r.source || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalEntries={pagination.totalEntries}
            pageSize={pagination.pageSize}
            loading={loading}
            onPageChange={(p) => fetchDetail(p)}
          />
        </div>
      )}

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={exportRows}
        metadata={exportMetadata}
        availableSections={ITEMIZED_SECTIONS}
        htmlGenerator={buildItemizedHtml as any}
        columnConfig={ITEMIZED_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={exportRows}
        metadata={exportMetadata}
        availableSections={ITEMIZED_SECTIONS}
        excelGenerator={buildItemizedExcelSheets as any}
        columnConfig={ITEMIZED_COLUMN_CONFIG}
        filename={`Itemized_Sales_${todayStr()}`}
      />
    </div>
  );
}
