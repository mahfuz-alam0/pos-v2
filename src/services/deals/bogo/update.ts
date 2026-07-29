import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateBogoDeal(id: string | number, body: { commonInfo: Record<string, any>; bogoDealInfo: Record<string, any> }) {
  try {
    const { data } = await api.put("/deals/bogo/update-info-and-rules", { id, ...body });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
