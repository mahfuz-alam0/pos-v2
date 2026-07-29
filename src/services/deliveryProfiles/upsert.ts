import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function upsertDeliveryProfile(body: Record<string, any>) {
  try {
    const { data } = await api.post("/delivery-profiles/upsert", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
