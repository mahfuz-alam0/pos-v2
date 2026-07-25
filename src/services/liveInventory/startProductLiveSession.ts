import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function startProductLiveSession(body) {
  try {
    const { data } = await api.post("/count-sessions/start-live-session", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
