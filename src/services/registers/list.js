import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchRegistersList(shopId, params = {}) {
  try {
    const { data } = await api.get("/registers/list", { params: { shopId, limit: 30, page: 1, ...params } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
