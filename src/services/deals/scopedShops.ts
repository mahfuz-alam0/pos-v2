import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchScopedShopIdsForDeals() {
  try {
    const { data } = await api.get("/deals/list-scoped-shop-ids-for-managing-regular-deals");
    return { data: data.data?.shopIds ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
