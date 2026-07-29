import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleCoupon(id: string | number) {
  try {
    const { data } = await api.get("/coupons/single-coupon", { params: { id } });
    return { data: data.data?.coupon ?? null };
  } catch (err) {
    handleApiError(err);
  }
}
