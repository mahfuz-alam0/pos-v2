import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchAllInventories(shopId, params = { limit: 30, page: 1 }) {
  try {
    const { data } = await api.get("/inventories/list-all", { params: { shopId, ...params } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
