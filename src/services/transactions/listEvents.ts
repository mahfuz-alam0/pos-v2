import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchTransactionEvents(params: Record<string, unknown>) {
  try {
    const { data } = await api.get("/transactions/list-transaction-events", { params });
    return { data: data?.data };
  } catch (err) {
    handleApiError(err);
  }
}
