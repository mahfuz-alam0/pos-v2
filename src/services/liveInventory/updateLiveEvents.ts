import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateLiveEvents(body) {
  try {
    const { data } = await api.put("/count-sessions/set-live-package-event-status", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
