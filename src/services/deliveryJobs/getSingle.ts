import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleDeliveryJob(id: string | number) {
  try {
    const { data } = await api.get("/delivery-jobs/single", { params: { id } });
    return { data: data.data?.deliveryJob };
  } catch (err) {
    handleApiError(err);
  }
}
