import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchPackagesList(shopId, params: Record<string, any> = { limit: 30, page: 1 }) {
  try {
    const { data } = await api.get("/platform-packages/list-packages-minimal", {
      params: { shopId, sortByCreatedAt: -1, ...params },
    });
    return { data: data.data?.packages ?? [], success: data.success };
  } catch (err) {
    handleApiError(err);
  }
}
