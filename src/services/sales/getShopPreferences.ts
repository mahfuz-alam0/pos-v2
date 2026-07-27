import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getShopPreferences() {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(`/organization-shop/get-shop-preference?shopId=${shopId}`);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
