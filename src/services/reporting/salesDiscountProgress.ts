import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSalesDiscountProgress(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/sales-discount-progress", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
