import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function checkLiveSessionCompatibility(shopId, params = {}) {
  try {
    const { data } = await api.get("/count-sessions/check-live-session-compatibility", {
      params: { shopId, ...params },
    });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
