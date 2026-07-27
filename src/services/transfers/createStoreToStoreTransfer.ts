import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createStoreToStoreTransfer(shopId: string, body: Record<string, any>) {
  try {
    const { data } = await api.post("/standalone-transfers/store-to-store/create", { ...body, shopId });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
