import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchProductsInSession(shopId, params = {}) {
  try {
    const { data } = await api.get("/count-sessions/list-products-ids-being-counted", {
      params: { shopId, ...params },
    });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
