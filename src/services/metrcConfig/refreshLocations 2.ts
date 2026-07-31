import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function refreshAvailableMetrcLocations(shopId: string) {
  try {
    const { data } = await api.put("/metrc-packages/refresh-metrc-package-locations", null, { params: { shopId } });
    return { data: data?.data?.locations?.packageLocations ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
