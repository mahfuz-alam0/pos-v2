import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeStrain(id: string | number) {
  try {
    const { data } = await api.delete("/strains/remove", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
