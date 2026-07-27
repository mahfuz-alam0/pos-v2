import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function blockCustomerLoyalty(customerId, reason) {
  try {
    const { data } = await api.put("/loyalty-reward/block-customer", { customerId, reason });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
