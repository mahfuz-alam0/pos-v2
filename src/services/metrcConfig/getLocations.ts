import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchAvailableMetrcLocations(shopId: string) {
  try {
    const { data } = await api.get("/metrc-packages/get-available-metrc-locations", { params: { shopId } });
    return { data: data?.data?.locations?.packageLocations ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
