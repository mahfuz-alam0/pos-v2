import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getCustomerLoyaltyHistory(customerId, page = 1, limit = 10) {
  try {
    const { data } = await api.get("/loyalty-reward/customer-loyalty-history", {
      params: { customerId, page, limit },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
