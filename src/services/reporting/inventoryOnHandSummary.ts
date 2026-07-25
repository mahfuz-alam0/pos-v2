import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchInventoryOnHandSummary(shopId: string, params: Record<string, any> = {}) {
  try {
    const { data } = await api.get("/reporting/inventory-on-hand/summary", {
      params: { shopId, ...params },
    });
    return data.data?.data;
  } catch (err) {
    handleApiError(err);
  }
}
