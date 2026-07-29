import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchTransactionDrawers(shopId: string, limit = 30) {
  try {
    const { data } = await api.get("/transactions/drawers/list", { params: { shopId, limit, page: 1 } });
    return { data: data?.data?.drawers ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
