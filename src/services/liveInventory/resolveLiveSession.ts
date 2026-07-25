import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function resolveLiveSession(body) {
  try {
    const { data } = await api.put("/count-sessions/resolve-session", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
