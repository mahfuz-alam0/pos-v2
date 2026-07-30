import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchProductSales(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/get-product-sales", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
