import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function findApplicableCoupons(body) {
  try {
    const response = await api.post("/coupons/list-all-applicable-coupons", body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
