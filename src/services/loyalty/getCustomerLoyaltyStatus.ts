import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getCustomerLoyaltyStatus(customerId) {
  try {
    const { data } = await api.get("/loyalty-reward/customer-loyalty-status", { params: { customerId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
