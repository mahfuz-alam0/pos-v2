import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

async function getCount(path, shopId) {
  try {
    const { data } = await api.get(`/stats/${path}`, { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export const getInventoryStats = (shopId) => getCount("inventory-stats/total-inventories", shopId);
export const getCustomersStats = (shopId) => getCount("customer-stats/total-customers", shopId);
export const getCompletedTasksStats = (shopId) => getCount("tasks-stats/total-pending-tasks", shopId);
export const getEmployeeStats = (shopId) => getCount("employee-stats/total-employees", shopId);
export const getSalesStats = (shopId) => getCount("sales-stats/total-completed-sales", shopId);
export const getDealsStats = (shopId) => getCount("deals-stats/total-deals", shopId);
