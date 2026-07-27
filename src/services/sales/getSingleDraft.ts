import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSingleDraft(shopId, id) {
  try {
    const response = await api.get(`/sale-drafts/single?shopId=${shopId}&id=${id}`);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
