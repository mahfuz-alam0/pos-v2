import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function listCustomerGroups() {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(`/customer-groups/list-all-customer-groups`, {
      params: { defaultPreferenceShopId: shopId },
    });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
