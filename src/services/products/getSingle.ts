import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleProduct(id) {
  try {
    const { data } = await api.get("/products/single-product", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
