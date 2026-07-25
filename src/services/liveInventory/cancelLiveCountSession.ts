import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function cancelLiveCountSession(body) {
  try {
    const { data } = await api.put("/count-sessions/cancel-live-count-session", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
