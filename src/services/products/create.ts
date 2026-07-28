import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createProduct(body: Record<string, any>) {
  try {
    const { data } = await api.post("/products/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
