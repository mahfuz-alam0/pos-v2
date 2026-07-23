import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchShopDashboardStats(shopId, date) {
  try {
    const { data } = await api.get("/stats/shop-dashboard", { params: { shopId, date } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
