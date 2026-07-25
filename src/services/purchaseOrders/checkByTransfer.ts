import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function checkPurchaseOrderByTransfer(transferId: string | number, shopId: string) {
  try {
    const { data } = await api.get(`/purchase-orders/by-transfer/${transferId}`, { params: { shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
