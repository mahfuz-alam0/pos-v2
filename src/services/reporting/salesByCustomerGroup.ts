import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSalesByCustomerGroup(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/sales-overview-by-customer-group", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
