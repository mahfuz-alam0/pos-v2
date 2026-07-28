import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleCategory(id: string | number) {
  try {
    const { data } = await api.get("/categories/single-category", { params: { id } });
    return { data: data.data?.category };
  } catch (err) {
    handleApiError(err);
  }
}
