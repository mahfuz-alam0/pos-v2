import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";
import type { CustomerQueueItem, CustomerQueueListResponse } from "./types";

export async function fetchCustomerQueueList(
  shopId,
  skip = 0,
  limit = 100
): Promise<{ data: CustomerQueueItem[]; hasMore: boolean }> {
  try {
    const { data } = await api.get<{ data: CustomerQueueListResponse }>("/customer-queue/list", {
      params: { shopId, skip, limit },
    });
    const customers = (data?.data?.customers || []).filter((c) => !c.isRemoved);
    return { data: customers, hasMore: data?.data?.hasMore || false };
  } catch (err) {
    handleApiError(err);
    return { data: [], hasMore: false };
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
