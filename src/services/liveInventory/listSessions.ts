import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSessionsList(shopId, params = {}) {
  try {
    const { data } = await api.get("/count-sessions/list-sessions", { params: { shopId, ...params } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
