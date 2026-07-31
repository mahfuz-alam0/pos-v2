import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchVaultTransactions(shopId: string, params: Record<string, unknown> = {}) {
  try {
    const { data } = await api.get("/vaults/list-transactions", { params: { shopId, ...params } });
    return { data: data?.data };
  } catch (err) {
    handleApiError(err);
  }
}
