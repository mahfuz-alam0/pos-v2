import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function dismissSession(body) {
  try {
    const { data } = await api.put("/count-sessions/dismiss-session", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
