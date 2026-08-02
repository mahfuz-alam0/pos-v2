"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchEodSalesSummary } from "@/services/reporting/eodSalesSummary";
import { fetchTaxSummary } from "@/services/reporting/taxSummary";
import { fetchProductTagSummary } from "@/services/reporting/productTagSummary";
import { fetchBrandPerformance } from "@/services/reporting/brandPerformance";
import { fetchSalesByProduct } from "@/services/reporting/salesByProduct";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import SalesTransactionsSection from "./SalesTransactionsSection";
import type {
  BrandPerformanceRow,
  CategorySalesRow,
  EodMetricRow,
  OnlinePaymentBreakdownRow,
  ProductSummaryRow,
  ProductTagRow,
  SaleTransactionRow,
  SalesSummaryExportData,
  TaxTotalRow,
} from "./types";

interface SalesSummaryTabProps {
  selectedDate: { startDate?: string; endDate?: string };
  formatCurrency: (v: number) => string;
  formatPercentage: (v: number) => string;
  categoryFilter: string | number | null;
  brandFilter: string | number | null;
  productFilter: string | number | null;
  sourceFilter: string | null;
  deliveryFilter: string | null;
  onDataLoad: (data: Partial<SalesSummaryExportData>) => void;
}

function renderMetricValue(
  val: number,
  record: EodMetricRow,
  columnKey: "marijuana" | "nonMarijuana" | "total",
  formatCurrency: (v: number) => string,
  formatPercentage: (v: number) => string,
) {
  if ((record.valueType === "count" || record.valueType === "percent") && columnKey !== "total") return "-";
  if (record.valueType === "count") return Number(val || 0);
  if (record.valueType === "percent") return formatPercentage(val || 0);
  return formatCurrency(val || 0);
}

function transformEodData(data: any): EodMetricRow[] {
  if (!data || typeof data !== "object") return [];
  const { overallStats, medicalStats, taxExemptedStats } = data;
  const stats = overallStats || {};

  const calculatedReturns = {
    marijuana: (stats.grossSales?.marijuana || 0) - (stats.discounts?.marijuana || 0) - (stats.netSales?.marijuana || 0),
    nonMarijuana: (stats.grossSales?.nonMarijuana || 0) - (stats.discounts?.nonMarijuana || 0) - (stats.netSales?.nonMarijuana || 0),
    total: (stats.grossSales?.total || 0) - (stats.discounts?.total || 0) - (stats.netSales?.total || 0),
  };

  const metrics: { key: string; data: any; valueType: EodMetricRow["valueType"] }[] = [
    { key: "Gross Sales", data: stats.grossSales, valueType: "currency" },
    { key: "Discounts", data: stats.discounts, valueType: "currency" },
    { key: "Returns", data: calculatedReturns, valueType: "currency" },
    { key: "Net Sales", data: stats.netSales, valueType: "currency" },
    { key: "COGS", data: stats.costOfGoods, valueType: "currency" },
    { key: "Gross Profit", data: stats.grossProfit, valueType: "currency" },
    { key: "Medical Customer Sales", data: medicalStats?.netSales, valueType: "currency" },
    { key: "Exempt Sales", data: taxExemptedStats?.netSales, valueType: "currency" },
    {
      key: "Taxable Sales",
      data:
        stats.netSales && taxExemptedStats?.netSales
          ? {
              marijuana: (stats.netSales.marijuana || 0) - (taxExemptedStats.netSales.marijuana || 0),
              nonMarijuana: (stats.netSales.nonMarijuana || 0) - (taxExemptedStats.netSales.nonMarijuana || 0),
              total: (stats.netSales.total || 0) - (taxExemptedStats.netSales.total || 0),
            }
          : null,
      valueType: "currency",
    },
    { key: "Total Items Sold", data: { total: stats.totalItemsSold || 0 }, valueType: "count" },
    { key: "Total Customers", data: { total: data.totalCustomers || 0 }, valueType: "count" },
    { key: "New Customers", data: { total: data.newCustomers || 0 }, valueType: "count" },
    { key: "Percentage of New Customers", data: { total: data.percentageNewCustomers || 0 }, valueType: "percent" },
    { key: "Average New Customer Sales", data: { total: data.avgNewCustomerSales || 0 }, valueType: "currency" },
  ];

  return metrics.map((item) => {
    const rowData = item.data || {};
    return {
      key: item.key,
      metric: item.key,
      marijuana: rowData.marijuana || 0,
      nonMarijuana: rowData.nonMarijuana || 0,
      total: rowData.total || 0,
      valueType: item.valueType,
    };
  });
}

function TableCard({ title, accent = "bg-sky-500", children }: { title: string; accent?: string; children: ReactNode }) {
  return (
    <Card className="flex h-full flex-col p-0 shadow-sm ring-0">
      <div className="flex items-center gap-3 px-6 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
        <div className={`h-5 w-1 rounded-full ${accent}`} />
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <div className="flex-1 overflow-auto" style={{ maxHeight: 400 }}>
        {children}
      </div>
    </Card>
  );
}

function SkeletonRows({ columns, rows = 3 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r} className="border-b-0">
          {Array.from({ length: columns }).map((__, c) => (
            <TableCell key={c}><Skeleton className="h-4 w-full" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export default function SalesSummaryTab({
  selectedDate,
  formatCurrency,
  formatPercentage,
  categoryFilter,
  brandFilter,
  productFilter,
  sourceFilter,
  deliveryFilter,
  onDataLoad,
}: SalesSummaryTabProps) {
  const { shopId } = useShop();

  const [loading, setLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [productLoadingMore, setProductLoadingMore] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);

  const [eodData, setEodData] = useState<EodMetricRow[]>([]);
  const [taxData, setTaxData] = useState<TaxTotalRow[]>([]);
  const [categoryData, setCategoryData] = useState<CategorySalesRow[]>([]);
  const [tagData, setTagData] = useState<ProductTagRow[]>([]);
  const [brandData, setBrandData] = useState<BrandPerformanceRow[]>([]);
  const [productData, setProductData] = useState<ProductSummaryRow[]>([]);
  const [saleTransactions, setSaleTransactions] = useState<SaleTransactionRow[]>([]);
  const [onlineBreakdown, setOnlineBreakdown] = useState<OnlinePaymentBreakdownRow[]>([]);

  const productPageRef = useRef(1);
  const productScrollRef = useRef<HTMLDivElement>(null);

  const commonParams = () => ({
    shopId,
    fromDate: selectedDate.startDate,
    toDate: selectedDate.endDate,
  });

  const fetchAllData = async () => {
    if (!shopId || !selectedDate.startDate) return;
    setLoading(true);

    const base = commonParams();
    const eodParams: Record<string, any> = { ...base };
    if (categoryFilter) eodParams.categoryId = categoryFilter;
    if (brandFilter) eodParams.brandId = brandFilter;
    if (productFilter) eodParams.productIds = [productFilter];
    if (sourceFilter) eodParams.source = sourceFilter;
    if (deliveryFilter) eodParams.deliveryMethod = deliveryFilter;

    const brandParams: Record<string, any> = { ...base, page: 1, limit: 20 };
    if (categoryFilter) brandParams.categoryId = categoryFilter;
    if (productFilter) brandParams.productId = productFilter;
    if (brandFilter) brandParams.brandId = brandFilter;
    if (sourceFilter) brandParams.source = sourceFilter;
    if (deliveryFilter) brandParams.deliveryMethod = deliveryFilter;

    const tagParams = { ...base, page: 1, limit: 50 };

    try {
      const [eodRes, taxRes, tagRes, brandRes] = await Promise.all([
        fetchEodSalesSummary(eodParams),
        fetchTaxSummary(base),
        fetchProductTagSummary(tagParams),
        fetchBrandPerformance(brandParams),
      ]);

      const transformedEod = transformEodData(eodRes?.data);
      const tax = Array.isArray(taxRes?.data?.data) ? taxRes.data.data : [];
      const tag = Array.isArray(tagRes?.data?.summary?.data) ? tagRes.data.summary.data : [];
      const brand = Array.isArray(brandRes?.data?.data) ? brandRes.data.data : [];
      const saleTx = Array.isArray(eodRes?.data?.saleTransactions) ? eodRes.data.saleTransactions : [];
      const onlineTx = Array.isArray(eodRes?.data?.onlinePaymentMethodBreakdown) ? eodRes.data.onlinePaymentMethodBreakdown : [];

      const categoriesDetail = eodRes?.data?.categoryWiseBreakdown || [];
      const transformedCategories: CategorySalesRow[] = categoriesDetail.map((cat: any) => ({
        categoryName: cat.categoryName,
        netSales: cat.netSales?.total || 0,
        grossMargin: cat.netSales?.total > 0 ? ((cat.grossProfit?.total || 0) / cat.netSales.total) * 100 : 0,
      }));

      setEodData(transformedEod);
      setTaxData(tax);
      setTagData(tag);
      setBrandData(brand);
      setSaleTransactions(saleTx);
      setOnlineBreakdown(onlineTx);
      setCategoryData(transformedCategories);

      onDataLoad?.({
        eodData: transformedEod,
        taxData: tax,
        tagData: tag,
        brandData: brand,
        saleTransactions: saleTx,
        onlineBreakdown: onlineTx,
        categoryData: transformedCategories,
      });
    } catch (error) {
      console.error("Error fetching sales summary data:", error);
      toast.error("Failed to load sales summary");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductData = async (page: number, append: boolean) => {
    if (!shopId || !selectedDate.startDate) return;
    if (append) setProductLoadingMore(true);
    else setProductLoading(true);

    const params: Record<string, any> = {
      shopId,
      startDate: selectedDate.startDate,
      endDate: selectedDate.endDate,
      page,
      limit: 10,
    };
    if (categoryFilter) params.categoryId = categoryFilter;
    if (brandFilter) params.brandId = brandFilter;
    if (productFilter) params.productId = productFilter;
    if (sourceFilter) params.source = sourceFilter;
    if (deliveryFilter) params.deliveryMethod = deliveryFilter;

    try {
      const res = await fetchSalesByProduct(params);
      const items: ProductSummaryRow[] = Array.isArray(res?.data?.data) ? res.data.data : [];
      const pagination = res?.data?.paginationData || {};

      if (append) {
        setProductData((prev) => {
          const updated = [...prev, ...items];
          onDataLoad?.({ productData: updated });
          return updated;
        });
      } else {
        setProductData(items);
        onDataLoad?.({ productData: items });
      }

      productPageRef.current = page;
      setHasMoreProducts(pagination.currentPage < pagination.totalPages);
    } catch (error) {
      console.error("Error fetching product data:", error);
      toast.error("Failed to load product summary");
    } finally {
      setProductLoading(false);
      setProductLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, selectedDate.startDate, selectedDate.endDate, categoryFilter, brandFilter, productFilter, sourceFilter, deliveryFilter]);

  useEffect(() => {
    productPageRef.current = 1;
    setHasMoreProducts(true);
    setProductData([]);
    fetchProductData(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, selectedDate.startDate, selectedDate.endDate, categoryFilter, brandFilter, productFilter, sourceFilter, deliveryFilter]);

  useEffect(() => {
    const el = productScrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop <= clientHeight + 50 && !productLoading && !productLoadingMore && hasMoreProducts) {
        fetchProductData(productPageRef.current + 1, true);
      }
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productLoading, productLoadingMore, hasMoreProducts]);

  const fmtVal = (val: number) => formatCurrency(val);
  const fmtPct = (val: number) => formatPercentage(val);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TableCard title="Sales Summary">
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Marijuana</TableHead>
                <TableHead className="text-right">Non-Marijuana</TableHead>
                <TableHead className="text-right">Total (Sum)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && eodData.length === 0 && <SkeletonRows columns={4} rows={6} />}
              {eodData.map((row, i) => (
                <TableRow key={row.key} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                  <TableCell className="font-medium">{row.metric}</TableCell>
                  <TableCell className="text-right">{renderMetricValue(row.marijuana, row, "marijuana", fmtVal, fmtPct)}</TableCell>
                  <TableCell className="text-right">{renderMetricValue(row.nonMarijuana, row, "nonMarijuana", fmtVal, fmtPct)}</TableCell>
                  <TableCell className="text-right">{renderMetricValue(row.total, row, "total", fmtVal, fmtPct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>

        <SalesTransactionsSection
          saleTransactions={saleTransactions}
          onlinePaymentMethodBreakdown={onlineBreakdown}
          formatCurrency={formatCurrency}
        />
      </div>

      <TableCard title="Tax Totals" accent="bg-indigo-500">
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Tax Name</TableHead>
              <TableHead className="text-right">Tax Rate %</TableHead>
              <TableHead className="text-right">Total Tax</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && taxData.length === 0 && <SkeletonRows columns={3} />}
            {!loading && taxData.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">No data available.</TableCell>
              </TableRow>
            )}
            {taxData.map((row, i) => (
              <TableRow key={row.taxName + i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                <TableCell>{row.taxName || "-"}</TableCell>
                <TableCell className="text-right">{fmtPct(row.taxRate)}</TableCell>
                <TableCell className="text-right">{fmtVal(row.totalTax)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TableCard title="Sales by Category">
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Net Sales</TableHead>
                <TableHead className="text-right">Gross Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && categoryData.length === 0 && <SkeletonRows columns={3} />}
              {!loading && categoryData.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">No data available.</TableCell>
                </TableRow>
              )}
              {categoryData.map((row, i) => (
                <TableRow key={row.categoryName + i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                  <TableCell>{row.categoryName}</TableCell>
                  <TableCell className="text-right">{fmtVal(row.netSales)}</TableCell>
                  <TableCell className="text-right">{fmtPct(row.grossMargin)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>

        <TableCard title="Product Tag Summary" accent="bg-indigo-500">
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Product Tag</TableHead>
                <TableHead className="text-right">Net Sales</TableHead>
                <TableHead className="text-right">Gross Margin</TableHead>
                <TableHead className="text-right"># Items</TableHead>
                <TableHead className="text-right">% Net Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && tagData.length === 0 && <SkeletonRows columns={5} />}
              {!loading && tagData.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No data available.</TableCell>
                </TableRow>
              )}
              {tagData.map((row, i) => (
                <TableRow key={(row.tagName || row.name || "") + i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                  <TableCell>{row.tagName || row.name || "N/A"}</TableCell>
                  <TableCell className="text-right">{fmtVal(row.netSales)}</TableCell>
                  <TableCell className="text-right">{fmtPct(row.grossMargin)}</TableCell>
                  <TableCell className="text-right">{row.items}</TableCell>
                  <TableCell className="text-right">{fmtPct(row.netSalesPercent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </div>

      <TableCard title="Brand Performance">
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Brand Name</TableHead>
              <TableHead className="text-right">Net Sales</TableHead>
              <TableHead className="text-right">Returns % of Sales</TableHead>
              <TableHead className="text-right">Effective Discount %</TableHead>
              <TableHead className="text-right">Gross Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && brandData.length === 0 && <SkeletonRows columns={5} />}
            {!loading && brandData.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No data available.</TableCell>
              </TableRow>
            )}
            {brandData.map((row, i) => (
              <TableRow key={row.brandName + i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                <TableCell>{row.brandName || "N/A"}</TableCell>
                <TableCell className="text-right">{fmtVal(row.netSales)}</TableCell>
                <TableCell className="text-right">{fmtPct(row.returnsPercentage)}</TableCell>
                <TableCell className="text-right">{fmtPct(row.effectiveDiscountPercent)}</TableCell>
                <TableCell className="text-right">{fmtPct(row.grossMargin)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      <Card className="p-0 shadow-sm ring-0">
        <div className="flex items-center gap-3 px-6 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
          <div className="h-5 w-1 rounded-full bg-slate-500" />
          <h3 className="text-base font-semibold">Product Summary</h3>
        </div>
        <div ref={productScrollRef} className="overflow-auto" style={{ maxHeight: 400 }}>
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Product Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Gross Sales</TableHead>
                <TableHead className="text-right">Discounts</TableHead>
                <TableHead className="text-right"># Items</TableHead>
                <TableHead className="text-right">Gross Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productLoading && productData.length === 0 && <SkeletonRows columns={8} />}
              {!productLoading && productData.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">No data available.</TableCell>
                </TableRow>
              )}
              {productData.map((row, i) => (
                <TableRow key={row.productId || i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                  <TableCell>{row.productName}</TableCell>
                  <TableCell>{row.productSKU || "-"}</TableCell>
                  <TableCell>{row.brandName || "-"}</TableCell>
                  <TableCell>{row.categoryName || "-"}</TableCell>
                  <TableCell className="text-right">{fmtVal(row.grossSales)}</TableCell>
                  <TableCell className="text-right">{fmtVal(row.totalDiscount)}</TableCell>
                  <TableCell className="text-right">{row.itemsSold}</TableCell>
                  <TableCell className="text-right">{fmtVal(row.grossProfit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {productLoadingMore && (
            <div className="py-2 text-center text-sm text-muted-foreground">Loading more products...</div>
          )}
        </div>
      </Card>
    </div>
  );
}
