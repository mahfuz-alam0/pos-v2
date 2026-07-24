import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getOrderStoreCredits(customerId, currencyCode = "usd") {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(
      `/store-credits/applicable-store-credits?customerId=${customerId}&targetShopId=${shopId}&currencyCode=${currencyCode}`
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
