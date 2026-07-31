import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createDrawer(body: { name: string; description?: string; shopId: string }) {
  try {
    const { data } = await api.post("/transactions/drawers/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
