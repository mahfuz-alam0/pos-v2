import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createCoupon(body: { couponInfo: Record<string, any>; expiryInfo: Record<string, any> }) {
  try {
    const { data } = await api.post("/coupons/create", body);
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
