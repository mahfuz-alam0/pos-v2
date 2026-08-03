import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchProductTaxDetailExemption(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/get-product-tax-detail-exemption", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
