import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleSession(id, shopId) {
  try {
    const { data } = await api.get("/count-sessions/single-session", { params: { id, shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
