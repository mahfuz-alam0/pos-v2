import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSessionOrderDetails(sessionId: string, shopId: string, transactionId?: string) {
  try {
    const params: Record<string, unknown> = { sessionId, shopId };
    if (transactionId) params.transactionId = transactionId;
    const { data } = await api.get("/transactions/session-orders", { params });
    return { data: data?.data };
  } catch (err) {
    handleApiError(err);
  }
}
