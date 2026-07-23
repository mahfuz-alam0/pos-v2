import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteStorageLocation(id, shopId) {
  try {
    const { data } = await api.delete("/storage-locations/delete", { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
