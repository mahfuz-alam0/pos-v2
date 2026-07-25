import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function submitLiveCountSession(body) {
  try {
    const { data } = await api.put("/count-sessions/submit-product-count-session", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
