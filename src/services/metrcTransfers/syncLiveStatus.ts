import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMetrcTransfersLiveSyncStatus(shopId: string) {
  try {
    const { data } = await api.get("/metrc-transfers/get-metrc-transfers-live-sync-status", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
