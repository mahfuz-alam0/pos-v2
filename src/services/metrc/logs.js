import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMetrcLogs({ limit = 100, page = 1, isError = "true" } = {}) {
  try {
    const { data } = await api.get("/metrc-common/logs", { params: { limit, page, isError } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function deleteMetrcLog(logId) {
  try {
    const { data } = await api.delete(`/metrc-common/logs/${logId}`);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function clearAllMetrcLogs() {
  try {
    const { data } = await api.delete("/metrc-common/logs");
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
