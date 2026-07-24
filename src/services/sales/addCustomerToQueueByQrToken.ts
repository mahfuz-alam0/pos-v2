import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function addCustomerToQueueByQrToken(body) {
  try {
    const response = await api.post("/customer-queue/add-by-qr-token", body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
