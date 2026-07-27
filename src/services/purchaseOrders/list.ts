import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchPurchaseOrdersList(shopId: string, params: Record<string, any> = {}) {
  try {
    const { data } = await api.get("/purchase-orders", { params: { shopId, ...params } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
