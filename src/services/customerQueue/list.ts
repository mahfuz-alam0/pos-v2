import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchCustomerQueueList(shopId, skip = 0, limit = 100) {
  try {
    const { data } = await api.get("/customer-queue/list", { params: { shopId, skip, limit } });
    return { data: (data?.data?.customers || []).filter((c) => !c.isRemoved), hasMore: data?.data?.hasMore };
  } catch (err) {
    handleApiError(err);
  }
}

export async function clearCustomerQueue(shopId) {
  try {
    const { data } = await api.put("/customer-queue/clear", { shopId });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
