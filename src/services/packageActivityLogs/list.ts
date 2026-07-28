import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchPackageActivityLogs(params: Record<string, any>) {
  try {
    const { data } = await api.get("/package-activity-logs/package-activity-logs", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
