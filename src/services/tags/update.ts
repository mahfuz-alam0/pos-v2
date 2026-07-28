import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateTag(id: string | number, body: Record<string, any>) {
  try {
    const { data } = await api.put("/product-tags/update", { ...body, id });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
