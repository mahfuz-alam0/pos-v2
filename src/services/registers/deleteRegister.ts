import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteRegister(id: string, shopId: string, version: number) {
  try {
    const { data } = await api.delete("/registers/delete", { params: { id, shopId, version } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
