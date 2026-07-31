import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMatrixAttributesList(params: Record<string, any> = { page: 1, limit: 10 }) {
  try {
    const { data } = await api.get("/matrix-attributes/list-attributes", { params });
    return { data: data.data?.attributes ?? [], paginationData: data.data?.paginationData };
  } catch (err) {
    handleApiError(err);
  }
}
