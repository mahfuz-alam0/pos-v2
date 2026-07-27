import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateCategory(id: string | number, body: Record<string, any>) {
  try {
    const { data } = await api.put("/categories/update", body, { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
