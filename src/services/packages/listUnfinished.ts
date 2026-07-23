import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchUnfinishedPackages(shopId, productId, params = { limit: 100, page: 1 }) {
  try {
    const { data } = await api.get("/platform-packages/list-unfinished-packages", {
      params: { shopId, productId, ...params },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
