import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateShopPreferences(body) {
  try {
    const response = await api.put("/organization-shop/update-shop-preference", body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
