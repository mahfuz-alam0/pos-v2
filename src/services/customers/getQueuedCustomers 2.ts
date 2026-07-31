import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getQueuedCustomers(params: {
  page?: number;
  limit?: number;
  customerId?: string;
  isOrderPlaced?: boolean | null;
  startDate?: string;
  endDate?: string;
} = {}) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const response = await api.get(`/reporting/get-queued-customers`, {
      params: { shopId, ...params },
    });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
