import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createRegister(body: Record<string, unknown>) {
  try {
    const { data } = await api.post("/registers/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
