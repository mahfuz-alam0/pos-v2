import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSingleSale(id) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(`/sales/single-sale?shopId=${shopId}&id=${id}`);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
