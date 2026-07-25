import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchPackageAdjustments(shopId, params = {}) {
  try {
    const { data } = await api.get("/single-package-adjustments/list-adjustments", {
      params: { shopId, limit: 30, page: 1, ...params },
    });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
