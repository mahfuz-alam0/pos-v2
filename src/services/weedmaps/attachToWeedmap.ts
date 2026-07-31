import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function attachProductToWeedmap(payload: {
  shopId: string;
  menuId: number;
  external_product_id: string;
}) {
  try {
    const { data } = await api.post("/weedmaps/attach-product-to-weedmap", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
