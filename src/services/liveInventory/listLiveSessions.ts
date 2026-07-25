import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchLiveSessions(shopId, params = {}) {
  try {
    const { data } = await api.get("/count-sessions/list-live-sessions", { params: { shopId, ...params } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
