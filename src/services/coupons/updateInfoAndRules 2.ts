import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateCouponInfoAndRules(id: string | number, body: Record<string, any>) {
  try {
    const { data } = await api.put("/coupons/update-info-and-rules", { id, ...body });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
