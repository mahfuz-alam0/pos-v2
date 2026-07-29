import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateRegularDeal(id: string | number, body: { commonInfo: Record<string, any>; regularDealInfo: Record<string, any> }) {
  try {
    const { data } = await api.put("/deals/regular/update-info-and-rules", { id, ...body });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
