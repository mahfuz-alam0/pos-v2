import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function approveShift(id: string, shopId: string) {
  try {
    const { data } = await api.put("/work-shifts/approve-shift", { id, shopId });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
