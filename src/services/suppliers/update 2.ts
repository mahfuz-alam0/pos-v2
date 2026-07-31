import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateSupplier(id: string | number, body: Record<string, any>) {
  try {
    const { data } = await api.put("/suppliers/update", body, { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
