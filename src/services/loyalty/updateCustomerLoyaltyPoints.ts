import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateCustomerLoyaltyPoints(customerId, points, reason) {
  try {
    const { data } = await api.put("/loyalty-reward/update-current-points", { customerId, points, reason });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
