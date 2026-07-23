import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchStorageLocations(shopId, params = {}) {
  try {
    const { data } = await api.get("/storage-locations/list-all-storage-locations", { params: { shopId, ...params } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
