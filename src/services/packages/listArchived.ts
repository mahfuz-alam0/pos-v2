import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchArchivedPackages(shopId: string, params: Record<string, any> = {}) {
  try {
    const { data } = await api.get("/archived-packages/list", { params: { shopId, ...params } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
