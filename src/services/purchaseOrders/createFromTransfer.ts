import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createPurchaseOrderFromTransfer(
  transferId: string | number,
  shopId: string,
  body: Record<string, any> = {}
) {
  try {
    const { data } = await api.post(`/purchase-orders/from-transfer/${transferId}`, { ...body, shopId });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
