import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function pushSelectedToLeafly(inventoryIds: string[]) {
  const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
  try {
    const { data } = await api.post("/leafly/menu/push/selected", { inventoryIds }, { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
