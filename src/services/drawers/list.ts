import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchDrawersList(shopId: string, params: Record<string, unknown> = {}) {
  try {
    const { data } = await api.get("/transactions/drawers/list", {
      params: { shopId, limit: 30, page: 1, ...params },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
