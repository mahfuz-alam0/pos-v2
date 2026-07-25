import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchProductsList(params: Record<string, any> = { page: 1, limit: 30 }) {
  try {
    const { data } = await api.get("/products/list-products", {
      params: { sortByAlpha: 1, ...params },
    });
    return { data: data.data?.products ?? [], paginationData: data.data?.paginationData };
  } catch (err) {
    handleApiError(err);
  }
}
