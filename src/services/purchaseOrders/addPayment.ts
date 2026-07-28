import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function addPaymentToPurchaseOrder(
  id: string | number,
  shopId: string,
  body: { amount: number; method: string; notes?: string }
) {
  try {
    const { data } = await api.post(`/purchase-orders/${id}/payments`, { ...body, shopId });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
