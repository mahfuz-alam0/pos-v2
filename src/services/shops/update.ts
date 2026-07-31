import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateShop(shopId: string | number, body: Record<string, any>) {
  try {
    const { data } = await api.put("/organization-shop/update-organization-shop", body, { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
