import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getCustomerTopCategories(customerId) {
  try {
    const response = await api.get(
      `/customer-stats/categories-stats?customerId=${customerId}`
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
