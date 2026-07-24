import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getShopPreference() {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(`/organization-shop/get-shop-preference?shopId=${shopId}`);
    return { data: response.data?.data };
  } catch (err) {
    handleApiError(err);
  }
}
