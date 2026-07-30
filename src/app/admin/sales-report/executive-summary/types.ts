export interface ExecutiveSummary {
  netSales: number;
  averageOrderValue: number;
  numberOfOrders: number;
  totalCustomers: number;
  marginPercent: number;
  winBackOrderPercent: number;
}

export const EMPTY_SUMMARY: ExecutiveSummary = {
  netSales: 0,
  averageOrderValue: 0,
  numberOfOrders: 0,
  totalCustomers: 0,
  marginPercent: 0,
  winBackOrderPercent: 0,
};

export interface SalesByCategoryRow {
  categoryId?: string;
  categoryName?: string;
  netSales?: number;
  grossMargin?: number;
}

export interface SalesByOrderSourceRow {
  orderSource?: string;
  onlineType?: string;
  netSales?: number;
  numberOfOrders?: number;
  aov?: number;
  grossMargin?: number;
  profitPerOrder?: number;
  percentNetSales?: number;
}

export interface SalesByStoreRow {
  shopId?: string;
  shopName?: string;
  netSales?: number;
  netSalesPercent?: number;
}

export interface SalesStatusAOVPoint {
  date: string;
  new: number;
  returning: number;
  reactivated: number;
  aov: number;
}

export interface MedicalVsRecreationalSlice {
  name: string;
  value: number;
  color: string;
}

export interface SalesHourStat {
  twelveHoursTime: string;
  totalHitCount: number;
  weekDay: number;
}

export interface TaxProfileStat {
  name: string;
  profileId: string;
  percentageUsed: number;
  profileName: string;
  totalRevenueInvolved: number;
  totalTimesApplied: number;
  totalAmount: number;
}

export interface OverallTaxStats {
  totalRevenueInvolved?: number;
  totalTimesApplied?: number;
  totalAmount?: number;
}

export interface DateRangeValue {
  startDate: string;
  endDate: string;
}
