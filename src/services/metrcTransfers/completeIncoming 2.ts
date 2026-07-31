import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function completeIncomingMetrcTransfer(body: Record<string, any>) {
  try {
    const { data } = await api.put("/metrc-transfers/complete-incoming", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
