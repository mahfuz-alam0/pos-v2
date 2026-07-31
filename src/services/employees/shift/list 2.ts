import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchShiftsList(params: Record<string, unknown> = {}) {
  try {
    const { data } = await api.get("/work-shifts/list-work-shifts", { params: { limit: 30, page: 1, ...params } });
    return { data: data?.data };
  } catch (err) {
    handleApiError(err);
  }
}
