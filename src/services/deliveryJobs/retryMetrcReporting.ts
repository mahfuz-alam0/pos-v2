import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function retryDeliveryJobMetrcReporting(body: { shopId: string | number; id: string | number }) {
  try {
    const { data } = await api.post("/delivery-jobs/retry-metrc-reporting", body);
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
