import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function unblockCustomerLoyalty(customerId) {
  try {
    const { data } = await api.put("/loyalty-reward/unblock-customer", { customerId });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
