import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function listMinimalPackages(shopId, productId, params: Record<string, any> = { limit: 100, page: 1 }) {
  try {
    const { data } = await api.get("/platform-packages/list-packages-minimal", {
      params: { shopId, productId, isFinished: false, ...params },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
