import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateInventoryPricingByCustomerGroup(body) {
  try {
    const { data } = await api.put("/inventories/update-customer-group-specific-pricing", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
