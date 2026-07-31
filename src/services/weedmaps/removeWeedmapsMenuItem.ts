import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeWeedmapsMenuItem({ shopId, inventoryId }: { shopId: string; inventoryId: string }) {
  try {
    const { data } = await api.delete("/weedmaps/remove-menu-item", { params: { shopId, inventoryId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
