import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMetrcSyncLiveStatus(shopId: string) {
  try {
    const { data } = await api.get("/metrc-packages/get-metrc-packages-live-sync-status", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
