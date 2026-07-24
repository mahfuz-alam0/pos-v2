import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function listUoms() {
  try {
    const response = await api.get(`/uoms/list-all`);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
