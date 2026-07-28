import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeSupplier(id: string | number) {
  try {
    const { data } = await api.delete("/suppliers/delete", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
