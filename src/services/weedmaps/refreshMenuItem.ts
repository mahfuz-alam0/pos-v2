import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function refreshWeedmapsMenuItemData(shopId: string, inventoryId: string) {
  try {
    const { data } = await api.put("/weedmaps/refresh-weedmaps-menu-item-data", { shopId, inventoryId });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
