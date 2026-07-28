import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function discloseDrawer(body, id) {
  try {
    const response = await api.put(`/transactions/drawers/disclose?id=${id}`, body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
