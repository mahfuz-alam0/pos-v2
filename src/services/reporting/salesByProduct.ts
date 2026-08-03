import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSalesByProduct(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/get-sales-by-product", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
