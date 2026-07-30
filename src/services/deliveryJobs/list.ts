import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchDeliveryJobsList(shopId: string | number, params: Record<string, any> = { page: 1, limit: 30 }) {
  try {
    const { data } = await api.get("/delivery-jobs/list", { params: { shopId, ...params } });
    return { data: data.data?.deliveryJobs ?? [], paginationData: data.data?.paginationData };
  } catch (err) {
    handleApiError(err);
  }
}
