import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createMetrcSyncJob(body: { shopId: string | number; numOfDays: number }) {
  try {
    const { data } = await api.post("/metrc-packages/create-metrc-packages-sync-job", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
