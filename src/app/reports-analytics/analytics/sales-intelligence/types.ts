export interface EodMetricRow {
  key: string;
  metric: string;
  marijuana: number;
  nonMarijuana: number;
  total: number;
  valueType: "currency" | "count" | "percent";
}

export interface TaxTotalRow {
  taxName: string;
  taxRate: number;
  totalTax: number;
}

export interface CategorySalesRow {
  categoryName: string;
  netSales: number;
  grossMargin: number;
}

export interface ProductTagRow {
  tagName?: string;
  name?: string;
  netSales: number;
  grossMargin: number;
  items: number;
  netSalesPercent: number;
}

export interface BrandPerformanceRow {
  brandName: string;
  netSales: number;
  returnsPercentage: number;
  effectiveDiscountPercent: number;
  grossMargin: number;
}

export interface ProductSummaryRow {
  productId?: string;
  productName: string;
  productSKU?: string;
  brandName?: string;
  categoryName?: string;
  grossSales: number;
  totalDiscount: number;
  itemsSold: number;
  grossProfit: number;
}

export interface SaleTransactionRow {
  paymentMethod: string;
  displayName?: string;
  totalFinalPayable: number;
}

export interface OnlinePaymentBreakdownRow {
  onlinePaymentMethod: string;
  displayName?: string;
  totalFinalPayable: number;
}

export interface SalesSummaryExportData {
  eodData: EodMetricRow[];
  taxData: TaxTotalRow[];
  categoryData: CategorySalesRow[];
  tagData: ProductTagRow[];
  brandData: BrandPerformanceRow[];
  productData: ProductSummaryRow[];
  saleTransactions: SaleTransactionRow[];
  onlineBreakdown: OnlinePaymentBreakdownRow[];
}

export interface ProfitCostSummary {
  grossSales?: number;
  discounts?: number;
  returns?: number;
  cogs?: number;
  grossProfit?: number;
  grossMargin?: number;
}

export interface ProfitCostDailyPoint {
  date: string;
  aov?: number;
  grossMargin?: number;
  percentOrdersWithDiscount?: number;
}

export interface ProductSoldAtLoss {
  productId?: string;
  storeName?: string;
  categoryName?: string;
  productName?: string;
  brandName?: string;
  itemsSold?: number;
  itemsCount?: number;
  grossSales?: number;
  subtotal?: number;
  netSales?: number;
  totalCost?: number;
  markdownPercent?: number;
  effectiveDiscountPercent?: number;
  grossMargin?: number;
  grossProfit?: number;
}

export interface ProfitCostData {
  summary?: ProfitCostSummary;
  dailyData?: ProfitCostDailyPoint[];
  productsSoldAtLoss?: ProductSoldAtLoss[];
}

export interface RevenueComparisonResult {
  currentRevenue: number;
  previousRevenue: number;
  difference: number;
  percentageChange: number;
  isIncrease: boolean;
}

export type SalesIntelligenceTab = "sales-summary" | "profit-cost" | "revenue-comparison";
