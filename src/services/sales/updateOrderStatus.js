import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateOrderStatus(body) {
  try {
    const response = await api.put("/sales/update-sale-status", body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
