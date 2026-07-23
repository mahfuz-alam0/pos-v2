import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchBrandsList(params = { limit: 30, page: 1 }) {
  try {
    const { data } = await api.get("/brands/list-brands", { params });
    return { data: data.data?.brands ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
