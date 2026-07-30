import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateCouponExpiry(id: string | number, shopBasisPromoExpiry: any[]) {
  try {
    const { data } = await api.put("/coupons/update-expiry", { id, shopBasisPromoExpiry });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
