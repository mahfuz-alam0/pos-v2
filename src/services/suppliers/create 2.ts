import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createSupplier(body: Record<string, any>) {
  try {
    const { data } = await api.post("/suppliers/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
