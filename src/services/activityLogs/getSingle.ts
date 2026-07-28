import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleActivityLog(id: string, shopId: string) {
  try {
    const { data } = await api.get("/overall-activity-logs/single-log", { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
