import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getInventorySellable(productId) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(
      `/inventories/single-inventory-sellable-on-physical-store?shopId=${shopId}&productId=${productId}`
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
