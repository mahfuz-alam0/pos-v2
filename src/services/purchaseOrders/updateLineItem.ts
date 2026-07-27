import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updatePurchaseOrderLineItem(
  id: string | number,
  lineItemId: string | number,
  shopId: string,
  body: { orderedQty?: number; receivedQty?: number; costPerUnit?: number }
) {
  try {
    const { data } = await api.post(`/purchase-orders/${id}/line-items/${lineItemId}`, { ...body, shopId });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
