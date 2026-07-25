import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function markStandaloneTransferCompleted(body: Record<string, any>) {
  try {
    const { data } = await api.put("/standalone-transfers/store-to-store/complete", body);
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
