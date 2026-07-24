import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getCustomerSalesStats(customerId) {
  try {
    const response = await api.get(
      `/customer-stats/sales-amount-stats?customerId=${customerId}`
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
