import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createRole(body: Record<string, unknown>) {
  try {
    const { data } = await api.post("/roles/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
