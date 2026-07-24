import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function replaceLiveSession(body) {
  try {
    const { data } = await api.put("/count-sessions/replace-live-user-session", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
