import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchLoyaltyPointsDiscount(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/loyalty-points-discount", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
