"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeftRight, BarChart3, Lightbulb, TrendingUp } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchProfitAndCost } from "@/services/reporting/profitAndCost";
import { fetchSalesByProduct } from "@/services/reporting/salesByProduct";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchProductsList } from "@/services/products/list";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApiSelect } from "@/components/ui/api-select";
import { DateRangeSelector, type SelectedDateResult } from "@/components/ui/date-range-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";

import MetricCards from "./MetricCards";
import ProfitAndLossTable from "./ProfitAndLossTable";
import FinancialBreakdown from "./FinancialBreakdown";
import PerformanceTrendsChart from "./PerformanceTrendsChart";
import ProductsSoldAtLossTable from "./ProductsSoldAtLossTable";
import SalesSummaryTab from "./SalesSummaryTab";
import RevenueComparisonTool from "./RevenueComparisonTool";
import {
  buildProfitCostExcelSheets,
  buildProfitCostHtml,
  buildRevenueComparisonExcelSheets,
  buildRevenueComparisonHtml,
  buildSalesSummaryExcelSheets,
  buildSalesSummaryHtml,
  exportProfitCostToCsv,
  exportRevenueComparisonToCsv,
  exportSalesSummaryToCsv,
  exportSheetsToExcel,
  getColumnConfig,
  getExportSections,
} from "./exportConfig";
import type {
  ProductSoldAtLoss,
  ProfitCostData,
  RevenueComparisonResult,
  SalesIntelligenceTab,
  SalesSummaryExportData,
} from "./types";

async function fetchCategoryPage(page: number, search: string) {
  const res = await fetchCategoriesList({ page, limit: 20, ...(search ? { search } : {}) });
  return {
    items: (res?.data || []).map((c: any) => ({ id: c.id, name: c.name })),
    totalPages: res?.paginationData?.totalPages || 1,
  };
}
async function fetchBrandPage(page: number, search: string) {
  const res = await fetchBrandsList({ page, limit: 20, ...(search ? { search } : {}) });
  return {
    items: (res?.data || []).map((b: any) => ({ id: b.id, name: b.name })),
    totalPages: res?.paginationData?.totalPages || 1,
  };
}
async function fetchProductPage(page: number, search: string) {
  const res = await fetchProductsList({ page, limit: 20, ...(search ? { search } : {}) });
  return {
    items: (res?.data || []).map((p: any) => ({ id: p.id, name: p.name })),
    totalPages: res?.paginationData?.totalPages || 1,
  };
}

function formatCurrency(value: number) {
  if (value === null || value === undefined) return "$0.00";
  const num = parseFloat(String(value));
  const abs = Math.abs(num);
  return num < 0 ? `-$${abs.toFixed(2)}` : `$${abs.toFixed(2)}`;
}
function formatPercentage(value: number) {
  if (value === null || value === undefined) return "0.0%";
  const num = parseFloat(String(value));
  const abs = Math.abs(num);
  return num < 0 ? `-${abs.toFixed(1)}%` : `${abs.toFixed(1)}%`;
}

export default function SalesIntelligence() {
  const { shopId, shopDetails } = useShop();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({
    startDate: todayStr,
    endDate: todayStr,
    timeEnabled: false,
  });
  const [activeTab, setActiveTab] = useState<SalesIntelligenceTab>("sales-summary");
  const [loading, setLoading] = useState(false);

  const [profitCostData, setProfitCostData] = useState<ProfitCostData | null>(null);
  const [productsAtLossData, setProductsAtLossData] = useState<ProductSoldAtLoss[]>([]);
  const [productsAtLossLoading, setProductsAtLossLoading] = useState(false);

  const [salesSummaryExportData, setSalesSummaryExportData] = useState<SalesSummaryExportData>({
    eodData: [],
    taxData: [],
    categoryData: [],
    tagData: [],
    brandData: [],
    productData: [],
    saleTransactions: [],
    onlineBreakdown: [],
  });
  const [revenueComparisonResult, setRevenueComparisonResult] = useState<RevenueComparisonResult | null>(null);

  const [pdfOpen, setPdfOpen] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<string | number | null>(null);
  const [brandFilter, setBrandFilter] = useState<string | number | null>(null);
  const [productFilter, setProductFilter] = useState<string | number | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [deliveryFilter, setDeliveryFilter] = useState<string | null>(null);

  const startDate = selectedDate.startDate ?? undefined;
  const endDate = selectedDate.endDate ?? startDate;
  const dateRange = { startDate, endDate };

  const handleClearFilters = () => {
    setSelectedDate({ startDate: todayStr, endDate: todayStr, timeEnabled: false });
    setCategoryFilter(null);
    setBrandFilter(null);
    setProductFilter(null);
    setSourceFilter(null);
    setDeliveryFilter(null);
  };

  const dateRangeLabel = useMemo(
    () =>
      startDate && endDate
        ? `${format(new Date(startDate), "MMM dd, yyyy")} - ${format(new Date(endDate), "MMM dd, yyyy")}`
        : "",
    [startDate, endDate],
  );

  const exportMetadata = {
    store: shopDetails?.name || shopDetails?.shopName || "",
    dateCreated: format(new Date(), "MM/dd/yyyy"),
    dateRange: dateRangeLabel,
  };

  const fetchProfitAndCostData = async () => {
    if (!shopId || !startDate) return;
    setLoading(true);
    try {
      const response = await fetchProfitAndCost({ shopId, fromDate: startDate, toDate: endDate });
      if (response?.success) {
        setProfitCostData(response.data);
      } else {
        toast.error("Failed to fetch profit and cost data");
      }
    } catch (error) {
      console.error("Error fetching profit and cost data:", error);
      toast.error("Error loading profit and cost data");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsAtLoss = async () => {
    if (!shopId || !startDate) return;
    setProductsAtLossLoading(true);
    try {
      const response = await fetchSalesByProduct({
        shopId,
        startDate,
        endDate,
        isNegativeMarginOnly: true,
        page: 1,
        limit: 100,
      });
      setProductsAtLossData(response?.success ? response.data?.data || [] : []);
    } catch (error) {
      console.error("Error fetching products at loss:", error);
      setProductsAtLossData([]);
    } finally {
      setProductsAtLossLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "profit-cost") {
      fetchProfitAndCostData();
      fetchProductsAtLoss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, startDate, endDate, activeTab]);

  const summary = profitCostData?.summary || {};
  const grossProfit = summary.grossProfit || 0;
  const grossMargin = summary.grossMargin || 0;
  const cogs = summary.cogs || 0;
  const grossSales = summary.grossSales || 0;
  const discounts = summary.discounts || 0;
  const returns = summary.returns || 0;
  const netSales = grossSales - discounts - returns;

  const profitLossTableData = [
    { key: 1, name: "Gross Sales", totalRevenue: formatCurrency(grossSales) },
    { key: 2, name: "Discounts", totalRevenue: formatCurrency(-discounts) },
    { key: 3, name: "Returns", totalRevenue: formatCurrency(-returns) },
    { key: 4, name: "Net Sales", totalRevenue: formatCurrency(netSales) },
    { key: 5, name: "COGS", totalRevenue: formatCurrency(-cogs) },
    { key: 6, name: "Gross Profit", totalRevenue: formatCurrency(grossProfit) },
  ];

  const chartData = (profitCostData?.dailyData || []).map((item) => ({
    date: format(new Date(item.date), "M/d"),
    aov: item.aov || 0,
    margin: item.grossMargin || 0,
    percentOfOrders: item.percentOrdersWithDiscount || 0,
  }));

  const productsAtLossTableData = productsAtLossData.map((item, index) => ({
    key: index + 1,
    productName: item.productName || "-",
    brandName: item.brandName || "-",
    category: item.categoryName || "-",
    itemsSold: item.itemsSold || 0,
    grossSales: formatCurrency(item.grossSales || 0),
    netSales: formatCurrency(item.subtotal || 0),
    totalCost: formatCurrency(item.totalCost || 0),
    effectiveDiscount: item.markdownPercent || 0,
    grossMargin: item.grossMargin || 0,
  }));

  const handleExportPdf = () => setPdfOpen(true);

  const handleExportExcel = () => {
    if (activeTab === "profit-cost") {
      exportSheetsToExcel(buildProfitCostExcelSheets(profitCostData || {}), "sales_intelligence_profit_cost");
    } else if (activeTab === "revenue-comparison") {
      if (!revenueComparisonResult) {
        toast.warning("No comparison data to export. Please calculate first.");
        return;
      }
      exportSheetsToExcel(buildRevenueComparisonExcelSheets(revenueComparisonResult), "sales_intelligence_revenue_comparison");
    } else {
      exportSheetsToExcel(buildSalesSummaryExcelSheets(salesSummaryExportData), "sales_intelligence_summary");
    }
  };

  const handleExportCsv = () => {
    try {
      if (activeTab === "revenue-comparison") {
        if (!revenueComparisonResult) {
          toast.warning("No comparison data to export. Please calculate first.");
          return;
        }
        exportRevenueComparisonToCsv(revenueComparisonResult);
      } else if (activeTab === "profit-cost") {
        exportProfitCostToCsv(profitCostData || {});
      } else {
        exportSalesSummaryToCsv(salesSummaryExportData);
      }
      toast.success("CSV downloaded successfully!");
    } catch {
      toast.error("Failed to export CSV.");
    }
  };

  const pdfData =
    activeTab === "profit-cost" ? profitCostData : activeTab === "revenue-comparison" ? revenueComparisonResult : salesSummaryExportData;

  const htmlGenerator =
    activeTab === "profit-cost" ? buildProfitCostHtml : activeTab === "revenue-comparison" ? buildRevenueComparisonHtml : buildSalesSummaryHtml;

  return (
    <div className="flex flex-col gap-4 p-6">
      <Card className="p-4 shadow-sm ring-0">
        <div className="flex items-start gap-4">
          <div className="flex shrink-0 items-center justify-center rounded-xl bg-blue-50 p-3 dark:bg-blue-950/40">
            <Lightbulb className="size-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Sales Intelligence</h1>
            <p className="text-sm text-muted-foreground">
              Gain insights and analytics to make data-driven sales decisions.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 shadow-sm ring-0">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
            <DateRangeSelector setSelectedDate={setSelectedDate} initialDate={{ startDate: selectedDate.startDate, endDate: selectedDate.endDate }} showAllOption={false} />
            <div className="flex gap-2 md:ml-auto">
              <Button variant="outline" onClick={handleClearFilters}>Clear</Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" disabled={activeTab === "revenue-comparison" && !revenueComparisonResult}>Export</Button>} />
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleExportPdf}>Export to PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>Export to Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCsv}>Export to CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-3 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:grid-cols-2 lg:grid-cols-5">
            <ApiSelect
              placeholder="All Classifications"
              value={categoryFilter}
              onChange={setCategoryFilter}
              fetchPage={fetchCategoryPage}
              triggerClassName="w-full"
            />
            <ApiSelect
              placeholder="All Brands"
              value={brandFilter}
              onChange={setBrandFilter}
              fetchPage={fetchBrandPage}
              triggerClassName="w-full"
            />
            <ApiSelect
              placeholder="All Products"
              value={productFilter}
              onChange={setProductFilter}
              fetchPage={fetchProductPage}
              triggerClassName="w-full"
            />
            <Select
              items={[
                { value: "__all__", label: "All Sources" },
                { value: "POS", label: "POS" },
                { value: "ECOM", label: "E-Commerce" },
                { value: "WEEDMAPS", label: "Weedmaps" },
              ]}
              value={sourceFilter ?? "__all__"}
              onValueChange={(v) => setSourceFilter(v === "__all__" ? null : v)}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="All Sources" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Sources</SelectItem>
                <SelectItem value="POS">POS</SelectItem>
                <SelectItem value="ECOM">E-Commerce</SelectItem>
                <SelectItem value="WEEDMAPS">Weedmaps</SelectItem>
              </SelectContent>
            </Select>
            <Select
              items={[
                { value: "__all__", label: "All Delivery Methods" },
                { value: "IN_STORE", label: "In Store" },
                { value: "PICK_UP", label: "Pick Up" },
                { value: "DELIVERY", label: "Delivery" },
              ]}
              value={deliveryFilter ?? "__all__"}
              onValueChange={(v) => setDeliveryFilter(v === "__all__" ? null : v)}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="All Delivery Methods" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Delivery Methods</SelectItem>
                <SelectItem value="IN_STORE">In Store</SelectItem>
                <SelectItem value="PICK_UP">Pick Up</SelectItem>
                <SelectItem value="DELIVERY">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SalesIntelligenceTab)}>
        <TabsList variant="line" className="h-auto w-full justify-start gap-1 p-0 pb-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">
          <TabsTrigger
            value="sales-summary"
            className="gap-1.5 rounded-none px-3 pb-3 text-sm font-medium text-muted-foreground data-active:bg-transparent data-active:text-primary [&_svg]:text-muted-foreground data-active:[&_svg]:text-primary"
          >
            <BarChart3 className="size-4" />
            Sales Summary
          </TabsTrigger>
          <TabsTrigger
            value="profit-cost"
            className="gap-1.5 rounded-none px-3 pb-3 text-sm font-medium text-muted-foreground data-active:bg-transparent data-active:text-primary [&_svg]:text-muted-foreground data-active:[&_svg]:text-primary"
          >
            <TrendingUp className="size-4" />
            Profit &amp; Cost
          </TabsTrigger>
          <TabsTrigger
            value="revenue-comparison"
            className="gap-1.5 rounded-none px-3 pb-3 text-sm font-medium text-muted-foreground data-active:bg-transparent data-active:text-primary [&_svg]:text-muted-foreground data-active:[&_svg]:text-primary"
          >
            <ArrowLeftRight className="size-4" />
            Revenue Comparison Tool
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales-summary" className="pt-4">
          <SalesSummaryTab
            selectedDate={dateRange}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
            categoryFilter={categoryFilter}
            brandFilter={brandFilter}
            productFilter={productFilter}
            sourceFilter={sourceFilter}
            deliveryFilter={deliveryFilter}
            onDataLoad={(data) => setSalesSummaryExportData((prev) => ({ ...prev, ...data }))}
          />
        </TabsContent>

        <TabsContent value="profit-cost" className="pt-4">
          <div className="space-y-6">
            <MetricCards
              grossProfit={grossProfit}
              grossMargin={grossMargin}
              netSales={netSales}
              cogs={cogs}
              formatCurrency={formatCurrency}
              formatPercentage={formatPercentage}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ProfitAndLossTable data={profitLossTableData} loading={loading} />
              <FinancialBreakdown grossSales={grossSales} discounts={discounts} returns={returns} cogs={cogs} formatCurrency={formatCurrency} />
            </div>
            <PerformanceTrendsChart data={chartData} />
            <ProductsSoldAtLossTable data={productsAtLossTableData} loading={productsAtLossLoading} formatPercentage={formatPercentage} />
          </div>
        </TabsContent>

        <TabsContent value="revenue-comparison" className="pt-4">
          <RevenueComparisonTool formatCurrency={formatCurrency} onResultChange={setRevenueComparisonResult} />
        </TabsContent>
      </Tabs>

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={pdfData}
        metadata={exportMetadata}
        availableSections={getExportSections(activeTab)}
        htmlGenerator={htmlGenerator as any}
        columnConfig={getColumnConfig(activeTab)}
      />
    </div>
  );
}
