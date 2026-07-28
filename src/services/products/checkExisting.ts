import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function checkExistingProduct(params: { sku?: string; ean?: string }) {
  try {
    const { data } = await api.get("/products/list-products-based-on-either-or", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
