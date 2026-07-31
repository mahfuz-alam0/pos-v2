import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteRole(id: string) {
  try {
    const { data } = await api.delete("/roles/delete", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
