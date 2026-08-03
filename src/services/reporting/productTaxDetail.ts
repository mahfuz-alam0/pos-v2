import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchProductTaxDetail(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/get-product-tax-detail", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
