import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeCategory(id: string | number) {
  try {
    const { data } = await api.delete("/categories/remove", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
