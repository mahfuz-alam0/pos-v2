import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMetrcLogs(shopId, { limit = 100, page = 1, isError = "true" } = {}) {
  try {
    const { data } = await api.get("/metrc-common/list-metrc-logs", { params: { shopId, limit, page, isError } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function deleteMetrcLog(logId, shopId) {
  try {
    const { data } = await api.delete(`/metrc-common/metrc-log/${logId}`, { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function clearAllMetrcLogs(shopId) {
  try {
    const { data } = await api.delete("/metrc-common/clear-all-metrc-error-logs", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
