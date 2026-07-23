import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateStorageLocation(id, body) {
  try {
    const { data } = await api.put("/storage-locations/update", body, { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
