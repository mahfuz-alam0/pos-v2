import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleShop(shopId: string | number) {
  try {
    const { data } = await api.get("/organization-shop/get-single-shop", { params: { shopId } });
    return { data: data.data?.shop };
  } catch (err) {
    handleApiError(err);
  }
}
