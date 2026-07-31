import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateShopRule(body: Record<string, any>) {
  try {
    const { data } = await api.patch("/customer-groups/update-shop-rule", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
