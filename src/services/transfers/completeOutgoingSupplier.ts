import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function completeOutgoingSupplierTransfer(shopId: string, body: Record<string, any>) {
  try {
    const { data } = await api.put("/standalone-transfers/supplier-specific/complete-outgoing", {
      ...body,
      shopId,
    });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
