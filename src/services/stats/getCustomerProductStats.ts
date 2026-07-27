import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getCustomerProductStats(customerId) {
  try {
    const { data } = await api.get("/customer-stats/product-stats", { params: { customerId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
