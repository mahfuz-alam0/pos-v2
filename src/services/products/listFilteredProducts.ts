import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";
import { generateAxiosParams } from "@/utils/axiosParams";

export async function listFilteredProducts(filters) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(`/products/list-products?shopId=${shopId}`, {
      params: generateAxiosParams(filters),
    });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
