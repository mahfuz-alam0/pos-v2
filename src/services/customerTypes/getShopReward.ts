import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getShopRewardByType(typeId: string | number) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.get("/customer-types/shop-reward-by-type", { params: { typeId, shopId } });
    return { data: data.data?.customerTypeRule };
  } catch (err) {
    handleApiError(err);
  }
}
