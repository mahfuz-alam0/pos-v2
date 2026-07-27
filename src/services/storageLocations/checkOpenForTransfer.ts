import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function checkStorageLocationOpenForTransfer(shopId: string) {
  try {
    const { data } = await api.get("/storage-locations/is-open-for-accepting-transfer", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
