import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getShopRuleByGroup(groupId: string | number) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.get("/customer-groups/shop-rule-by-group", { params: { groupId, shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
