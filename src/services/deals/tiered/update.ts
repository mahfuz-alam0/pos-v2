import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateTieredDeal(id: string | number, body: { commonInfo: Record<string, any>; tieredDealInfo: Record<string, any> }) {
  try {
    const { data } = await api.put("/deals/tiered/update-info-and-rules", { id, ...body });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
