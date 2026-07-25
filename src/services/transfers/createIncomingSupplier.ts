import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createIncomingSupplierTransfer(shopId: string, body: Record<string, any>) {
  try {
    const { data } = await api.post("/standalone-transfers/supplier-specific/create-incoming", {
      ...body,
      shopId,
    });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
