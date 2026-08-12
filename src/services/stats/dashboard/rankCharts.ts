import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export interface SaleAmountBreakdownPoint {
  _id: { year: number; month: number; dayOfMonth?: number };
  totalSaleAmount: number;
  totalPreTaxSaleAmount?: number;
  totalTaxAmount?: number;
}

export interface SaleAmountRankResponse {
  success?: boolean;
  data?: { breakdownData?: SaleAmountBreakdownPoint[] };
}

function getShopId(shopId?: string): string | undefined {
  try {
    return JSON.parse(localStorage.getItem("shopId") || "null") ?? shopId;
  } catch {
    return shopId;
  }
}

async function getRankChart<T = any>(path: string, countParam: string, count: number | string, shopId?: string): Promise<{ data: T } | undefined> {
  try {
    const { data } = await api.get(`/stats/${path}`, {
      params: { shopId: getShopId(shopId), [countParam]: count },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export const getProductsDailyRank = (daysCount: number | string, shopId?: string) =>
  getRankChart("products/daily-rank-chart", "daysCount", daysCount, shopId);
export const getProductsMonthlyRank = (monthsCount: number | string, shopId?: string) =>
  getRankChart("products/monthly-rank-chart", "monthsCount", monthsCount, shopId);

export const getBrandsDailyRank = (daysCount: number | string, shopId?: string) =>
  getRankChart("brands/daily-rank-chart", "daysCount", daysCount, shopId);
export const getBrandsMonthlyRank = (monthsCount: number | string, shopId?: string) =>
  getRankChart("brands/monthly-rank-chart", "monthsCount", monthsCount, shopId);

export const getCategoriesDailyRank = (daysCount: number | string, shopId?: string) =>
  getRankChart("categories/daily-rank-chart", "daysCount", daysCount, shopId);
export const getCategoriesMonthlyRank = (monthsCount: number | string, shopId?: string) =>
  getRankChart("categories/monthly-rank-chart", "monthsCount", monthsCount, shopId);

export const getSaleAmountDailyRank = (daysCount: number | string, shopId?: string) =>
  getRankChart<SaleAmountRankResponse>("sale-amounts/daily-rank-chart", "daysCount", daysCount, shopId);
export const getSaleAmountMonthlyRank = (monthsCount: number | string, shopId?: string) =>
  getRankChart<SaleAmountRankResponse>("sale-amounts/monthly-rank-chart", "monthsCount", monthsCount, shopId);

export const getSaleHourWeekDay = (daysCount: number | string, shopId?: string) =>
  getRankChart("sale-hours/week-day-rank-chart", "daysCount", daysCount, shopId);

export const getCustomerConversionsDailyRank = (daysCount: number | string, shopId?: string) =>
  getRankChart("customer-conversions/daily-rank-chart", "daysCount", daysCount, shopId);
export const getCustomerConversionsMonthlyRank = (monthsCount: number | string, shopId?: string) =>
  getRankChart("customer-conversions/monthly-rank-chart", "monthsCount", monthsCount, shopId);
