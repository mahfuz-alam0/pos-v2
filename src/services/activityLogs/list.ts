import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchOverallActivityLogs(params: Record<string, any>) {
  try {
    const { data } = await api.get("/overall-activity-logs/list-logs-cursor", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
