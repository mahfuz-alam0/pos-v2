import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateRegister(id: string, body: Record<string, unknown>) {
  try {
    const { data } = await api.put("/registers/update", body, { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
