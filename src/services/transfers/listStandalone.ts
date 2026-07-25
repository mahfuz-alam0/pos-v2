import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchStandaloneTransfers(shopId: string, params: Record<string, any> = {}) {
  try {
    const { data } = await api.get("/standalone-transfers/list-all", { params: { shopId, ...params } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
