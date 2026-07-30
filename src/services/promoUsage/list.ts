import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchPromoUsages(params: { promoType: "COUPON" | "DEAL"; couponId?: string; dealId?: string; page?: number; limit?: number }) {
  try {
    const { data } = await api.get("/promo-usage/list-usages", { params });
    return { data: data.data?.usages ?? [], paginationData: data.data?.paginationData };
  } catch (err) {
    handleApiError(err);
  }
}
