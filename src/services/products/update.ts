import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateProduct(id: string, body: Record<string, any>) {
  try {
    const { data } = await api.put("/products/update", body, { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
