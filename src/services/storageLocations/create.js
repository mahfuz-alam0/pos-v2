import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createStorageLocation(body) {
  try {
    const { data } = await api.post("/storage-locations/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
