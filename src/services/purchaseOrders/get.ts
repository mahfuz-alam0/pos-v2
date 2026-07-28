import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchPurchaseOrder(id: string | number, shopId: string) {
  try {
    const { data } = await api.get(`/purchase-orders/${id}`, { params: { shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
