import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getMenuItemDetails({ shopId, inventoryId }: { shopId: string; inventoryId: string }) {
  try {
    const { data } = await api.get("/weedmaps/menu-item-details", { params: { shopId, inventoryId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
