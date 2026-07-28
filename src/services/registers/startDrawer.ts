import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function startDrawer(body, id) {
  try {
    const response = await api.put(`/transactions/drawers/start?id=${id}`, body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
