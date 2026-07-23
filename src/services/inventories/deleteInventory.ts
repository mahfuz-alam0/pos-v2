import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteInventory(id, shopId) {
  try {
    const { data } = await api.put("/inventories/delete", null, { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
