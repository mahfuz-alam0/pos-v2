import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleInventory(id, shopId) {
  try {
    const { data } = await api.get("/inventories/single", { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
