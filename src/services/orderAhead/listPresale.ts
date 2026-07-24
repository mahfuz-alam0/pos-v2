import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchPendingPreSales(shopId, filters = {}) {
  try {
    const { data } = await api.get("/pre-sales/list-all-pending-pre-sales", {
      params: { shopId, ...filters },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
