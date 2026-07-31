import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchLoyaltyAdjustments(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/list-loyalty-adjustments", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
