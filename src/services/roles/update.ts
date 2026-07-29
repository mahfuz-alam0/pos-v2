import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateRole(body: Record<string, unknown>) {
  try {
    const { data } = await api.put("/roles/update", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
