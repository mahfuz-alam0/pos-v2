import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

function getShopId(shopId) {
  try {
    return JSON.parse(localStorage.getItem("shopId") || "null") ?? shopId;
  } catch {
    return shopId;
  }
}

async function getRankChart(path, countParam, count, shopId) {
  try {
    const { data } = await api.get(`/stats/${path}`, {
      params: { shopId: getShopId(shopId), [countParam]: count },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export const getProductsDailyRank = (daysCount, shopId) =>
  getRankChart("products/daily-rank-chart", "daysCount", daysCount, shopId);
export const getProductsMonthlyRank = (monthsCount, shopId) =>
  getRankChart("products/monthly-rank-chart", "monthsCount", monthsCount, shopId);

export const getBrandsDailyRank = (daysCount, shopId) =>
  getRankChart("brands/daily-rank-chart", "daysCount", daysCount, shopId);
export const getBrandsMonthlyRank = (monthsCount, shopId) =>
  getRankChart("brands/monthly-rank-chart", "monthsCount", monthsCount, shopId);

export const getCategoriesDailyRank = (daysCount, shopId) =>
  getRankChart("categories/daily-rank-chart", "daysCount", daysCount, shopId);
export const getCategoriesMonthlyRank = (monthsCount, shopId) =>
  getRankChart("categories/monthly-rank-chart", "monthsCount", monthsCount, shopId);

export const getSaleAmountDailyRank = (daysCount, shopId) =>
  getRankChart("sale-amounts/daily-rank-chart", "daysCount", daysCount, shopId);
export const getSaleAmountMonthlyRank = (monthsCount, shopId) =>
  getRankChart("sale-amounts/monthly-rank-chart", "monthsCount", monthsCount, shopId);

export const getSaleHourWeekDay = (daysCount, shopId) =>
  getRankChart("sale-hours/week-day-rank-chart", "daysCount", daysCount, shopId);

export const getCustomerConversionsDailyRank = (daysCount, shopId) =>
  getRankChart("customer-conversions/daily-rank-chart", "daysCount", daysCount, shopId);
export const getCustomerConversionsMonthlyRank = (monthsCount, shopId) =>
  getRankChart("customer-conversions/monthly-rank-chart", "monthsCount", monthsCount, shopId);
