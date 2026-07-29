import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createPurchaseOrderFromMetrcTransfer(
  metrcTransferId: string | number,
  shopId: string,
  body: Record<string, any> = {}
) {
  try {
    const { data } = await api.post(`/purchase-orders/from-metrc-transfer/${metrcTransferId}`, { ...body, shopId });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
