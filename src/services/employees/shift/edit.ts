import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function editShift(body: Record<string, unknown>) {
  try {
    const { data } = await api.put("/work-shifts/edit-shift", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
