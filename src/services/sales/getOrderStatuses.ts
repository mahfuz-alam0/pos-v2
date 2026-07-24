import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getOrderStatuses(source, deliveryMethod) {
  try {
    const response = await api.get(
      `/sales/available-sale-statuses?source=${source}&deliveryMethod=${deliveryMethod}`
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
