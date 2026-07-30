import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function setCustomerGroupTaxes(body: unknown) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.put("/tax-profiles/set-customer-group-specific-taxes", {
      ...(body as object),
      shopId,
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
