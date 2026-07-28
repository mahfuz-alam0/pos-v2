import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeClassification(id: string | number) {
  try {
    const { data } = await api.delete("/classifications/remove", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
