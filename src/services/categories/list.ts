import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchCategoriesList(params = { page: 1, limit: 30 }) {
  try {
    const { data } = await api.get("/categories/list-categories", { params });
    return { data: data.data?.categories ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
