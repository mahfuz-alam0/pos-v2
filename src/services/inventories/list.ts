import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchInventoriesList(shopId, params = {}) {
  try {
    const { data } = await api.get("/inventories/list-all", { params: { shopId, ...params } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
