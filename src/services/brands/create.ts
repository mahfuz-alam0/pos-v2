import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createBrand(body) {
  try {
    const { data } = await api.post("/brands/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
