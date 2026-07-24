import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSingleProduct(id) {
  try {
    const response = await api.get(`/products/single-product`, { params: { id } });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
