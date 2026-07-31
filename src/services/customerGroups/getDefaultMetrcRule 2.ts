import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getDefaultMetrcRule() {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.get("/customer-groups/get-default-metrc-rule-setup-template", { params: { shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
