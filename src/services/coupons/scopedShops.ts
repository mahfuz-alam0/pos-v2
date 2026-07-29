import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchScopedShopIdsForCoupons() {
  try {
    const { data } = await api.get("/coupons/list-scoped-shop-ids-for-managing-coupons");
    return { data: data.data?.shopIds ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
