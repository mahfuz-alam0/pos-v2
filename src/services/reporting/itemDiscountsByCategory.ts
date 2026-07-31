import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchItemDiscountsByCategory(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/get-item-discounts-by-category", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
