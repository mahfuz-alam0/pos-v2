import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function addCustomerToQueue(body) {
  try {
    const response = await api.post("/customer-queue/add", body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
