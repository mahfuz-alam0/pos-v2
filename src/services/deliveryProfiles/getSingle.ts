import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleDeliveryProfile(id: string, shopId: string | number) {
  try {
    const { data } = await api.get("/delivery-profiles/single", { params: { shopId, id } });
    return { data: data.data?.deliveryProfile };
  } catch (err) {
    handleApiError(err);
  }
}
