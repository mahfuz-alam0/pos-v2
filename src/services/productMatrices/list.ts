import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchProductMatricesList(params: Record<string, any> = { page: 1, limit: 10 }) {
  try {
    const { data } = await api.get("/product-matrices/list-matrices", { params });
    return { data: data.data?.matrices ?? [], paginationData: data.data?.paginationData };
  } catch (err) {
    handleApiError(err);
  }
}
