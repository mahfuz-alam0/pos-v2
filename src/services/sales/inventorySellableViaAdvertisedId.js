import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getInventorySellableViaAdvertisedId(advertisedPackageId) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(
      `/inventories/single-inventory-sellable-on-physical-store?shopId=${shopId}&advertisedPackageId=${advertisedPackageId}`
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
