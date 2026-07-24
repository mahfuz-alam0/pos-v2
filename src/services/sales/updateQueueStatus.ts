import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateQueueStatus(body) {
  try {
    const response = await api.put("/customer-queue/update", body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
