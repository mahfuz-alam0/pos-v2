import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchClassificationsList(params: Record<string, any> = { page: 1, limit: 10 }) {
  try {
    const { data } = await api.get("/classifications/list-classifications", { params });
    return { data: data.data?.classifications ?? [], paginationData: data.data?.paginationData };
  } catch (err) {
    handleApiError(err);
  }
}
