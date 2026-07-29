import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchVaultSummary(shopId: string) {
  try {
    const { data } = await api.get("/vaults/summary", { params: { shopId } });
    return { data: data?.data?.summary };
  } catch (err) {
    handleApiError(err);
  }
}
