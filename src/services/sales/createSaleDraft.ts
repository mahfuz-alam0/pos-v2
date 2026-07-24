import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createSaleDraft(body) {
  try {
    const response = await api.post("/sale-drafts/create", body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
