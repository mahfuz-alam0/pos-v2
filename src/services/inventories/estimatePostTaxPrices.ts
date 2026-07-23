import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function estimatePostTaxPrices(body) {
  try {
    const { data } = await api.post("/inventories/estimate-post-tax-prices", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
