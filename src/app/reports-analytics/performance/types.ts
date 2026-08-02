export interface EmployeePerformanceRow {
  key: string;
  employeeName: string;
  netSales: number;
  orders: number;
  aov: number;
  effectiveDiscount: number;
  ordersDiscount: number;
  percentNetSales: number;
}

export interface EmployeePerformanceByCategoryRow {
  key: string;
  category: string;
  employeeName: string;
  grossSales: number;
  netSales: number;
  items: number;
}

export interface BrandSummaryRow {
  key: string;
  brand: string;
  netSales: number;
  returns: number;
  effectiveDiscount: number;
  grossMargin: number;
}
