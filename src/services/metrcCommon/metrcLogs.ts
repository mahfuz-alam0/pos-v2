import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMetrcLogs(shopId: string, params: { limit: number; page: number; isError: boolean }) {
  try {
    const { data } = await api.get("/metrc-common/list-metrc-logs", { params: { shopId, ...params } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function deleteMetrcLog(shopId: string, logId: string) {
  try {
    const { data } = await api.delete(`/metrc-common/metrc-log/${logId}`, { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function clearAllMetrcLogs(shopId: string) {
  try {
    const { data } = await api.delete("/metrc-common/clear-all-metrc-error-logs", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchMetrcQueuedJobs(shopId: string) {
  try {
    const { data } = await api.get("/metrc-common/get-metrc-queued-jobs", { params: { shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function refreshQueuedMetrcJobs(shopId: string) {
  try {
    const { data } = await api.post("/metrc-common/refresh-queued-metrc-jobs", {}, { params: { shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
