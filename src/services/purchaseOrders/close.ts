import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function closePurchaseOrder(id: string | number, shopId: string) {
  try {
    const { data } = await api.post(`/purchase-orders/${id}/close`, { shopId });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
