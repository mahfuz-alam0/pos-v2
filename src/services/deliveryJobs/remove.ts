import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeDeliveryJob(id: string | number, shopId: string | number) {
  try {
    const { data } = await api.delete("/delivery-jobs/delete", { params: { id, shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
