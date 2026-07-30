import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createRegularDeal(body: { commonInfo: Record<string, any>; expiryInfo: Record<string, any>; regularDealInfo: Record<string, any> }) {
  try {
    const { data } = await api.post("/deals/regular/create", body);
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
