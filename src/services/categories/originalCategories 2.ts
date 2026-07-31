import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchOriginalCategories(shopId: string | number, params: { limit: number; page: number; name?: string }) {
  try {
    const { data } = await api.get("/categories/original", { params: { shopId, ...params } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
