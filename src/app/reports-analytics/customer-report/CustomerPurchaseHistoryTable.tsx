"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchCustomersPurchaseHistory } from "@/services/reporting/customersPurchaseHistory";
import { fetchCustomerTypeSummary } from "@/services/reporting/customerTypeSummary";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchProductsList } from "@/services/products/list";
import { listCustomerTypes } from "@/services/customers/listCustomerTypes";
import { fetchSingleShop } from "@/services/shops/getSingle";

import { Button } from "@/components/ui/button";
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
import { TablePagination, TableLoadingOverlay } from "@/components/ui/table-pagination";
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
  PURCHASE_HISTORY_SECTIONS,
  PURCHASE_HISTORY_EXCEL_COLUMN_CONFIG,
  getPurchaseHistorySummary,
  buildPurchaseHistoryHtml,
  buildPurchaseHistoryExcelSheets,
  exportPurchaseHistoryToCsv,
} from "./exportConfig.purchaseHistory";

const PAGE_SIZE = 30;
const SUMMARY_PAGE_SIZE = 50;

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function CustomerPurchaseHistoryTable() {
  const { shopId } = useShop();

  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({
    startDate: todayStr(),
    endDate: todayStr(),
    timeEnabled: false,
  });

  const [runReport, setRunReport] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>({});
  const [customerTypes, setCustomerTypes] = useState<{ id: string; name: string }[]>([]);
  const [selectedCustomerType, setSelectedCustomerType] = useState("");
  const [categoryId, setCategoryId] = useState<string | number | null>(null);
  const [brandId, setBrandId] = useState<string | number | null>(null);
  const [productId, setProductId] = useState<string | number | null>(null);
  const [isDelivery, setIsDelivery] = useState("");

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalEntries: 0 });

  const [summaryRows, setSummaryRows] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryPagination, setSummaryPagination] = useState({ page: 1, totalPages: 1, totalEntries: 0 });

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await listCustomerTypes();
      setCustomerTypes(res?.data?.data?.customerTypes || []);
    })();
  }, []);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      const res = await fetchSingleShop(shopId);
      setStoreInfo(res?.data || {});
    })();
  }, [shopId]);

  const filters = useMemo(
    () => ({
      startDate: selectedDate.startDate || "",
      endDate: selectedDate.endDate || "",
      shopId: shopId || "",
      categoryId: categoryId || "",
      brandId: brandId || "",
      productId: productId || "",
      isDelivery,
      ...(selectedCustomerType ? { customerTypeId: selectedCustomerType } : {}),
    }),
    [selectedDate, shopId, categoryId, brandId, productId, isDelivery, selectedCustomerType],
  );

  const fetchDetail = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await fetchCustomersPurchaseHistory({ ...filters, page, limit: PAGE_SIZE });
        setRows(res?.data ?? []);
        const pd = res?.paginationData;
        if (pd) {
          setPagination({ page: pd.currentPage || page, totalPages: pd.totalPages || 1, totalEntries: pd.totalEntries || 0 });
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load purchase history");
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  const fetchSummary = useCallback(
    async (page = 1) => {
      setSummaryLoading(true);
      try {
        const res = await fetchCustomerTypeSummary({
          page,
          limit: SUMMARY_PAGE_SIZE,
          startDate: filters.startDate,
          endDate: filters.endDate,
          shopId: filters.shopId,
          ...(selectedCustomerType ? { customerTypeId: selectedCustomerType } : {}),
        });
        setSummaryRows(res?.data ?? []);
        const pd = res?.paginationData;
        if (pd) {
          setSummaryPagination({ page: pd.currentPage || page, totalPages: pd.totalPages || 1, totalEntries: pd.totalEntries || 0 });
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load customer type summary");
      } finally {
        setSummaryLoading(false);
      }
    },
    [filters, selectedCustomerType],
  );

  const handleRunReport = async () => {
    await Promise.all([fetchDetail(1), fetchSummary(1)]);
    setRunReport(true);
  };

  const fetchCategoryPage = useCallback(async (page: number, search: string) => {
    const res = await fetchCategoriesList({ page, limit: 20, search });
    return {
      items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name || c.classification?.name || "Unnamed" })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const fetchBrandPage = useCallback(async (page: number, search: string) => {
    const res = await fetchBrandsList({ page, limit: 20, search });
    return {
      items: (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const fetchProductPage = useCallback(async (page: number, search: string) => {
    const res = await fetchProductsList({ page, limit: 20, search });
    return {
      items: (res?.data ?? []).map((p: any) => ({ id: p.id, name: p.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const handleExportCsv = () => {
    if (!rows.length) {
      toast.warning("No data to export");
      return;
    }
    exportPurchaseHistoryToCsv(rows, `customer_purchase_history_${todayStr()}.csv`);
    toast.success("CSV downloaded");
  };

  const totalQuantity = rows.reduce((sum, r) => sum + (r.quantity || 0), 0);
  const totalSaleAmount = rows.reduce((sum, r) => sum + (r.saleAmount || 0), 0);
  const totalNetWeight = rows.reduce((sum, r) => sum + (r.totalNetWeight || 0), 0);
  const totalRecords = pagination.totalEntries || rows.length;

  const exportMetadata = {
    storeName: storeInfo?.name || storeInfo?.shopName || "Store",
    date: todayStr(),
    selectedDate,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Date Range</div>
          <DateRangeSelector setSelectedDate={setSelectedDate} initialDate={selectedDate} showAllOption={false} />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Customer Type</div>
          <Select
            items={[{ value: "", label: "All" }, ...customerTypes.map((o) => ({ value: o.id, label: o.name }))]}
            value={selectedCustomerType}
            onValueChange={setSelectedCustomerType}
          >
            <SelectTrigger className="w-62.5">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {customerTypes.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Classifications</div>
          <ApiSelect placeholder="All Classifications" value={categoryId} onChange={setCategoryId} fetchPage={fetchCategoryPage} />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Products</div>
          <ApiSelect placeholder="All Products" value={productId} onChange={setProductId} fetchPage={fetchProductPage} />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Brands</div>
          <ApiSelect placeholder="All Brands" value={brandId} onChange={setBrandId} fetchPage={fetchBrandPage} />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Delivery Method</div>
          <Select
            items={[
              { value: "", label: "All" },
              { value: "IN_STORE", label: "In Store" },
              { value: "PICK_UP", label: "Pick Up" },
              { value: "DELIVERY", label: "Delivery" },
            ]}
            value={isDelivery}
            onValueChange={setIsDelivery}
          >
            <SelectTrigger className="w-62.5">
              <SelectValue placeholder="Select delivery method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="IN_STORE">In Store</SelectItem>
              <SelectItem value="PICK_UP">Pick Up</SelectItem>
              <SelectItem value="DELIVERY">Delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 shrink-0" aria-hidden="true" />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" disabled={!runReport}>Export</Button>} />
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setPdfOpen(true)}>Export to PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExcelOpen(true)}>Export to Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv}>Export to CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleRunReport} disabled={loading || summaryLoading}>
            Run Report
          </Button>
        </div>
      </div>

      {runReport && (
        <>
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold">Summary by Customer Type</h3>
            <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <TableLoadingOverlay show={summaryLoading && summaryRows.length > 0} />
              <div className="overflow-auto *:data-[slot=table-container]:overflow-visible" style={{ maxHeight: "calc(100vh - 600px)", minHeight: "12rem" }}>
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
                    <TableRow className="bg-muted/60">
                      <TableHead className="w-45">Store</TableHead>
                      <TableHead className="w-50">Customer Type</TableHead>
                      <TableHead className="w-62.5">Description</TableHead>
                      <TableHead className="w-37.5 text-right">Total Customers</TableHead>
                      <TableHead className="w-37.5 text-right">Total Sales</TableHead>
                      <TableHead className="w-37.5 text-right">Total Revenue</TableHead>
                      <TableHead className="w-40 text-right">Avg Order Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryLoading && summaryRows.length === 0 &&
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={`s-${i}`} className="border-b-0">
                          {Array.from({ length: 7 }).map((__, j) => (
                            <TableCell key={j}>
                              <div className="h-4 w-full animate-pulse rounded bg-muted" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    {!summaryLoading && summaryRows.length === 0 && (
                      <TableRow className="border-b-0">
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          No summary data found.
                        </TableCell>
                      </TableRow>
                    )}
                    {summaryRows.map((row, i) => (
                      <TableRow key={row.customerTypeId ?? i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                        <TableCell>{row.shopName || "All Stores"}</TableCell>
                        <TableCell>{row.customerTypeName || "N/A"}</TableCell>
                        <TableCell>{row.description || "N/A"}</TableCell>
                        <TableCell className="text-right">{(row.totalCustomers ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(row.totalSales ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">${(row.totalRevenue ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${(row.averageOrderValue ?? 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <TablePagination
              page={summaryPagination.page}
              totalPages={summaryPagination.totalPages}
              totalEntries={summaryPagination.totalEntries}
              pageSize={SUMMARY_PAGE_SIZE}
              loading={summaryLoading}
              onPageChange={(p) => fetchSummary(p)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold">Customer Purchase History</h3>
            <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <TableLoadingOverlay show={loading && rows.length > 0} />
              <div className="overflow-auto *:data-[slot=table-container]:overflow-visible" style={{ maxHeight: "calc(100vh - 420px)" }}>
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
                    <TableRow className="bg-muted/60">
                      <TableHead className="w-45">Store</TableHead>
                      <TableHead className="w-50">Customer</TableHead>
                      <TableHead className="w-50">Email</TableHead>
                      <TableHead className="w-37.5">Phone</TableHead>
                      <TableHead className="w-50">Customer Type</TableHead>
                      <TableHead className="w-62.5">Customer Groups</TableHead>
                      <TableHead className="w-50">Medical License</TableHead>
                      <TableHead className="w-37.5">Date of Birth</TableHead>
                      <TableHead className="w-37.5">Category</TableHead>
                      <TableHead className="w-50">Product Name</TableHead>
                      <TableHead className="w-37.5">SKU</TableHead>
                      <TableHead className="w-25">Unit</TableHead>
                      <TableHead className="w-25 text-right">Quantity</TableHead>
                      <TableHead className="w-37.5 text-right">Sale Amount</TableHead>
                      <TableHead className="w-37.5 text-right">Total Net Weight</TableHead>
                      <TableHead className="w-30">Delivery</TableHead>
                      <TableHead className="w-50">Date of Purchase</TableHead>
                    </TableRow>
                    <TableRow className="border-b-0 bg-muted/40 font-semibold">
                      <TableHead colSpan={7} className="text-center">
                        TOTALS → ({totalRecords} records)
                      </TableHead>
                      <TableHead className="text-right">Qty: {totalQuantity}</TableHead>
                      <TableHead className="text-right">${totalSaleAmount.toFixed(2)}</TableHead>
                      <TableHead className="text-right">Net Wt: {totalNetWeight}</TableHead>
                      <TableHead colSpan={7} className="text-center">
                        -
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && rows.length === 0 &&
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={`s-${i}`} className="border-b-0">
                          {Array.from({ length: 17 }).map((__, j) => (
                            <TableCell key={j}>
                              <div className="h-4 w-full animate-pulse rounded bg-muted" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    {!loading && rows.length === 0 && (
                      <TableRow className="border-b-0">
                        <TableCell colSpan={17} className="py-10 text-center text-muted-foreground">
                          No purchase history found.
                        </TableCell>
                      </TableRow>
                    )}
                    {rows.map((row, i) => (
                      <TableRow
                        key={`${row._id || "row"}-${row.customerId || "cust"}-${row.dateOfPurchase || ""}-${row.productName || ""}-${i}`}
                        className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                      >
                        <TableCell>{row.shopName || "-"}</TableCell>
                        <TableCell>{`${row.firstName || ""} ${row.lastName || ""}`.trim()}</TableCell>
                        <TableCell>{row.email || "-"}</TableCell>
                        <TableCell>{row.phone || "-"}</TableCell>
                        <TableCell>{row.customerType || "-"}</TableCell>
                        <TableCell>
                          {row.groups?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {row.groups.map((g: string, idx: number) => {
                                const isRecreational = g.toLowerCase().includes("recreational");
                                const isMedical = g.toLowerCase().includes("medical");
                                return (
                                  <span
                                    key={idx}
                                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                                      isRecreational
                                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                                        : isMedical
                                          ? "bg-green-50 text-green-600 dark:bg-green-950/40"
                                          : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {g.includes("(MJ - System Generated)") ? g.split("(")[0].trim() : g}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{row.medicalLicense || "-"}</TableCell>
                        <TableCell>{row.dateOfBirth ? format(new Date(row.dateOfBirth), "yyyy-MM-dd") : "-"}</TableCell>
                        <TableCell>{row.categoryName || "-"}</TableCell>
                        <TableCell>{row.productName || "-"}</TableCell>
                        <TableCell>{row.SKU || "-"}</TableCell>
                        <TableCell>{row.unit || "-"}</TableCell>
                        <TableCell className="text-right">{row.quantity || 0}</TableCell>
                        <TableCell className="text-right">${(row.saleAmount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{row.totalNetWeight || 0}</TableCell>
                        <TableCell>{row.delivery || "-"}</TableCell>
                        <TableCell>{row.dateOfPurchase ? format(new Date(row.dateOfPurchase), "yyyy-MM-dd HH:mm:ss") : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <TablePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalEntries={pagination.totalEntries}
              pageSize={PAGE_SIZE}
              loading={loading}
              onPageChange={(p) => fetchDetail(p)}
            />
          </div>
        </>
      )}

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={rows}
        metadata={exportMetadata}
        availableSections={PURCHASE_HISTORY_SECTIONS}
        htmlGenerator={buildPurchaseHistoryHtml as any}
        columnConfig={PURCHASE_HISTORY_EXCEL_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={rows}
        metadata={exportMetadata}
        availableSections={PURCHASE_HISTORY_SECTIONS}
        excelGenerator={buildPurchaseHistoryExcelSheets as any}
        columnConfig={PURCHASE_HISTORY_EXCEL_COLUMN_CONFIG}
        filename={`Customer_Purchase_History_${todayStr()}`}
      />
    </div>
  );
}
