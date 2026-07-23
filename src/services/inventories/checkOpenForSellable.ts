import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function checkIsOpenForSellableStores(shopId) {
  try {
    const { data } = await api.get("/storage-locations/is-open-for-sellable-on-physical-store", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
