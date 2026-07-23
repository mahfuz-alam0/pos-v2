import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleInventoryByProductId(productId, shopId) {
  try {
    const { data } = await api.get("/inventories/single", { params: { productId, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
