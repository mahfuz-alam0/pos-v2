import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function clearCustomerQueue() {
  try {
    const body = {
      shopId: JSON.parse(localStorage.getItem("shopId")),
    };
    const response = await api.put("/customer-queue/clear", body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
