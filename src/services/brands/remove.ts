import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeBrand(id: string | number) {
  try {
    const { data } = await api.delete("/brands/remove", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
