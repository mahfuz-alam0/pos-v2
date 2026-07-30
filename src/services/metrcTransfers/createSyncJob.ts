import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createMetrcTransfersSyncJob(body: { shopId: string | number; numOfDays: number }) {
  try {
    const { data } = await api.post("/metrc-transfers/create-metrc-transfers-sync-job", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
