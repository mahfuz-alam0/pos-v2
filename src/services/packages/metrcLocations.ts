import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMetrcLocations(shopId: string) {
  try {
    const { data } = await api.get("/metrc-packages/get-available-metrc-locations", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function refreshMetrcLocations(shopId: string) {
  try {
    const { data } = await api.put("/metrc-packages/refresh-metrc-package-locations", null, { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
