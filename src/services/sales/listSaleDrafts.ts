import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function listSaleDrafts(shopId) {
  try {
    const response = await api.get(`/sale-drafts/list?shopId=${shopId}`);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
