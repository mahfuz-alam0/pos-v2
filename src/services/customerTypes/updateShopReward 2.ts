import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateShopReward(body: Record<string, any>) {
  try {
    const { data } = await api.patch("/customer-types/update-shop-reward", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
