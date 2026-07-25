import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchWithinLocationTransfers(shopId: string, params: Record<string, any> = {}) {
  try {
    const { data } = await api.get("/in-store-transfers/list-all", { params: { shopId, ...params } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
