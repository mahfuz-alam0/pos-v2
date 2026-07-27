import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getCustomerTopBrands(customerId) {
  try {
    const response = await api.get(
      `/customer-stats/brands-stats?customerId=${customerId}`
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
