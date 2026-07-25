import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function completeIncomingSupplierTransfer(shopId: string, body: Record<string, any>) {
  try {
    const { data } = await api.put("/standalone-transfers/supplier-specific/complete-incoming", {
      ...body,
      shopId,
    });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
