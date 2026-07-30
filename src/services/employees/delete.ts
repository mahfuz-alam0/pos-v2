import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteEmployee(id: string) {
  try {
    const { data } = await api.delete("/organization-accounts/delete", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
