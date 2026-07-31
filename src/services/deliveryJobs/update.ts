import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateDeliveryJob(body: Record<string, any>) {
  try {
    const { data } = await api.put("/delivery-jobs/update", body);
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
