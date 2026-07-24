import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getDiscountTypes() {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(`/sales/get-available-discount-types?shopId=${shopId}`);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
