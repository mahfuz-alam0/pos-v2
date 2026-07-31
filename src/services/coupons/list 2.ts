import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchCouponsList(params: Record<string, any> = {}) {
  try {
    const { data } = await api.get("/coupons/list-all-coupons", { params });
    return { data: data.data?.coupons ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
