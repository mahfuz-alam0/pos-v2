export interface ReportPagination {
  page: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
}

/* ---------------- shared "sales by X" row shape ---------------- */
/* Classification / Day / Employee / Location / Product reports all */
/* return this same base shape plus dynamic per-tax columns. */

export interface TaxBreakdownItem {
  name: string;
  totalAmount: number;
}

export interface SalesByBaseRow {
  itemsSold?: number;
  grossSales?: number;
  subtotal?: number;
  totalCost?: number;
  grossProfit?: number;
  grossMargin?: number;
  totalDiscount?: number;
  markdownPercent?: number;
  totalTax?: number;
  taxBreakdown?: TaxBreakdownItem[];
}

export interface SalesByCategoryRow extends SalesByBaseRow {
  categoryName: string;
}

export interface SalesByDayRow extends SalesByBaseRow {
  date: string;
  averageTransactions?: number;
  avgItemTransaction?: number;
}

export interface SalesByEmployeeRow extends SalesByBaseRow {
  createdEmployeeName?: string;
  employeeId?: string;
  totalOrders?: number;
  averageOrderValue?: number;
  avgItemsPerOrder?: number;
}

export interface SalesByLocationRow extends SalesByBaseRow {
  shopId?: string;
  shopName?: string;
  transactionAvg?: number;
  avgItemPerTransaction?: number;
  loyaltyRedemptions?: number;
  cash?: number;
  debit?: number;
}

export interface SalesByProductRow extends SalesByBaseRow {
  productId?: string;
  productName?: string;
  productSKU?: string;
  categoryName?: string;
  brandName?: string;
}

export interface SalesBySummary {
  itemsSold?: number;
  grossSales?: number;
  subtotal?: number;
  totalCost?: number;
  grossProfit?: number;
  totalDiscount?: number;
  totalTax?: number;
  totalOrders?: number;
}

/* ---------------- Itemized Sales ---------------- */

export interface ItemizedSaleRow {
  saleId?: string;
  productName?: string;
  timeOfSale?: string;
  dayOfWeek?: number;
  brandName?: string;
  categoryName?: string;
  strains?: string[];
  packageName?: string;
  advertisedPackageId?: string;
  unitCost?: number;
  unitPrice?: number;
  totalPriceBeforeTax?: number;
  finalTotalPrice?: number;
  quantitySold?: number;
  unitOfMeasurement?: string;
  totalCost?: number;
  discountAmount?: number;
  discountBreakdown?: { type?: string; name?: string; discountRate?: number; discountRateType?: string; discountAmountDollars?: number; subCategory?: string; notes?: string }[];
  taxAmount?: number;
  productProfile?: string;
  netWeight?: number;
  unitWeight?: number;
  thcPercent?: number;
  cbdPercent?: number;
  customerName?: string;
  employeeName?: string;
  supplierName?: string;
  manufacturerSKU?: string;
  metrcPackageTag?: string;
  metrcProductId?: string;
  deliveryMethod?: string;
  source?: string;
}

/* ---------------- Sales Discount Progress ---------------- */

export interface SalesDiscountProgress {
  discountGoalLimitPercent?: number;
  highDiscountWarningCount?: number;
  totalVoids?: number;
  totalRefunds?: number;
  employeeSalesGoal?: number | null;
  locationSalesGoal?: number | null;
  employeesUnderSalesGoal?: number;
  locationsUnderSalesGoal?: number;
}

/* ---------------- Sales Overview ---------------- */

export interface StatBlock {
  marijuana?: number;
  nonMarijuana?: number;
  other?: number;
  total?: number;
}

export interface OverallStats {
  grossSales?: StatBlock;
  discounts?: StatBlock;
  netSales?: StatBlock;
  grossProfit?: StatBlock;
  costOfGoods?: StatBlock;
  totalWithoutTax?: StatBlock;
  totalFinalPayable?: StatBlock;
  totalPaymentProcessingDiscount?: number;
  totalPaymentProcessingFee?: number;
  totalTipGiven?: number;
  totalNumberOfSales?: number;
  totalNumberOfSaleReturns?: number;
  totalItemsSold?: number;
}

export interface DetailedStats {
  grossSales?: StatBlock;
  discounts?: StatBlock;
  netSales?: StatBlock;
  grossProfit?: StatBlock;
  costOfGoods?: StatBlock;
  totalSubtotal?: number;
  totalPaymentProcessingFee?: number;
  totalTipGiven?: number;
  totalNumberOfSales?: number;
  totalNumberOfSaleReturns?: number;
  totalItemsSold?: number;
  totalFinalPayable?: number;
  totalPaymentProcessingDiscount?: number;
}

export interface SaleTransaction {
  paymentMethod?: string;
  displayName?: string;
  totalSubtotal?: number;
  totalFinalPayable?: number;
}

export interface CombinedShiftReportData {
  totalCashIn?: number;
  totalCashOut?: number;
  totalVirtualIn?: number;
  totalVirtualOut?: number;
  totalCashAdjusted?: number;
  totalVirtualAdjusted?: number;
}

export interface TaxDetail {
  taxName: string;
  taxRate: number;
  timesApplied?: number;
  taxesRevenue?: number;
  totalAmount: number;
}

export interface ClassificationTaxGroup {
  classificationName: string;
  isMJ?: boolean;
  taxes: TaxDetail[];
}

export interface CategoryWiseBreakdownRow {
  categoryId?: string;
  categoryName?: string;
  totalItemsSold?: number;
  grossSales?: StatBlock;
  discounts?: StatBlock;
  netSales?: StatBlock;
  grossProfit?: StatBlock;
  costOfGoods?: StatBlock;
}

export interface SalesOverviewData {
  overallStats?: OverallStats;
  medicalStats?: DetailedStats;
  nonMedicalStats?: DetailedStats;
  taxExemptedStats?: DetailedStats;
  individualTaxesBreakDown?: TaxDetail[];
  taxesByClassification?: ClassificationTaxGroup[];
  saleTransactions?: SaleTransaction[];
  saleReturnTransactions?: SaleTransaction[];
  combinedShiftReport?: CombinedShiftReportData;
  categoryWiseBreakdown?: CategoryWiseBreakdownRow[];
  totalCustomers?: number;
  newCustomers?: number;
  percentageNewCustomers?: number;
  avgNewCustomerSales?: number;
}

export interface OrderSalesSummaryMetric {
  total?: number;
  average?: number;
}

export interface OrderSalesSummaryData {
  numberOfOrders?: number;
  cogs?: OrderSalesSummaryMetric;
  lineItemDiscounts?: OrderSalesSummaryMetric;
  subtotal?: OrderSalesSummaryMetric;
  storeCredits?: OrderSalesSummaryMetric;
  adjustments?: OrderSalesSummaryMetric;
  loyalty?: OrderSalesSummaryMetric;
  taxes?: OrderSalesSummaryMetric;
  grandTotal?: OrderSalesSummaryMetric;
  totalWithoutTaxes?: OrderSalesSummaryMetric;
}

export interface CustomerGroupSalesData {
  customerGroupId: string;
  customerGroupName: string;
  overallStats?: OverallStats;
  totalCustomers?: number;
  newCustomers?: number;
  percentageNewCustomers?: number;
  averageNewCustomerSales?: number;
}

export interface CustomerTypeOption {
  id: string;
  name: string;
}

/* ---------------- filter option types (shared) ---------------- */

export interface CategoryOption {
  id: string;
  name: string;
  classification?: { name?: string };
}

export interface BrandOption {
  id: string;
  name: string;
}

export interface ProductOption {
  id: string;
  name: string;
}

export interface EmployeeOption {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export interface ShopOption {
  id: string;
  name: string;
}
