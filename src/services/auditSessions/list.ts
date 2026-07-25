import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchAuditSessions(shopId, params = {}) {
  try {
    const { data } = await api.get("/committed-audit-sessions/list", {
      params: { shopId, limit: 30, page: 1, ...params },
    });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
