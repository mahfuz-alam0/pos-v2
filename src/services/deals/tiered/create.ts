import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createTieredDeal(body: { commonInfo: Record<string, any>; expiryInfo: Record<string, any>; tieredDealInfo: Record<string, any> }) {
  try {
    const { data } = await api.post("/deals/tiered/create", body);
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
