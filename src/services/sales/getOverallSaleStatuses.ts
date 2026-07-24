import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getOverallSaleStatuses() {
  try {
    const { data } = await api.get("/sales/overall-sale-statuses");
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
