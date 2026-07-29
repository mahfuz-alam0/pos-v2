import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteDrawer(id: string, shopId: string, version: number) {
  try {
    const { data } = await api.delete("/transactions/drawers/delete", { params: { id, shopId, version } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
