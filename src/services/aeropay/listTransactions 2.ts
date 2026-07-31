import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchAchTransactions(params: Record<string, unknown>) {
  try {
    const { data } = await api.get("/aeropay/list-all-transactions", { params });
    return { data: data?.data };
  } catch (err) {
    handleApiError(err);
  }
}
