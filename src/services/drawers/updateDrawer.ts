import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateDrawer(
  id: string,
  body: { name: string; description?: string; shopId: string; version: number }
) {
  try {
    const { data } = await api.put("/transactions/drawers/update", body, { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
