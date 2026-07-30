import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchOrderSalesSummary(params: Record<string, any>) {
  try {
    const { data } = await api.get("/sales/order-sales-summary", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
