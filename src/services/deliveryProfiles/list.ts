import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchDeliveryProfilesList(shopId: string | number, params: Record<string, any> = { page: 1, limit: 30 }) {
  try {
    const { data } = await api.get("/delivery-profiles/list", { params: { shopId, ...params } });
    return { data: data.data?.deliveryProfiles ?? [], paginationData: data.data?.paginationData };
  } catch (err) {
    handleApiError(err);
  }
}
