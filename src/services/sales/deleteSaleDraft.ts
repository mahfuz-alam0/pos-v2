import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteSaleDraft(shopId, id) {
  try {
    const response = await api.delete(`/sale-drafts/delete?shopId=${shopId}&id=${id}`);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
