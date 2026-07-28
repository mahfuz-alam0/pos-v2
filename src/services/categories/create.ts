import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createCategory(body) {
  try {
    const { data } = await api.post("/categories/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
