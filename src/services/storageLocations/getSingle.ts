import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleStorageLocation(id, shopId) {
  try {
    const { data } = await api.get("/storage-locations/single-storage-location", { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
