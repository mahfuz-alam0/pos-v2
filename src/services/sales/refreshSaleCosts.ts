import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function refreshSaleCosts(shopId, date) {
  try {
    const { data } = await api.post("/sales/refresh-costs", { shopId, date });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
