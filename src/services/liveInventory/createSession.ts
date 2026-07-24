import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createLiveSession(body) {
  try {
    const { data } = await api.post("/count-sessions/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
