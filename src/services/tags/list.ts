import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchTagsList(params: Record<string, any> = { page: 1, limit: 30 }) {
  try {
    const { data } = await api.get("/product-tags/list-product-tags", { params });
    return { data: data.data?.tags ?? [], paginationData: data.data?.paginationData };
  } catch (err) {
    handleApiError(err);
  }
}
