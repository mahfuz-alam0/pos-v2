import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeDriver(id: string | number) {
  try {
    const { data } = await api.delete("/drivers/delete", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
