import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function changeAdvertisedId(shopId: string, id: string, newAdvertisedId: string) {
  try {
    const { data } = await api.put("/platform-packages/change-advertised-id", { shopId, id, newAdvertisedId });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
