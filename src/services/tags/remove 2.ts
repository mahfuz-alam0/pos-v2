import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeTag(id: string | number) {
  try {
    const { data } = await api.delete("/product-tags/remove", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
