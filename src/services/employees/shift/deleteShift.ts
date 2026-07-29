import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteShift(id: string, shopId: string) {
  try {
    const { data } = await api.delete("/work-shifts/delete-shift", { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
