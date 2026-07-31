import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function withdrawFromVault(shopId: string, body: { amount: number; reason?: string }) {
  try {
    const { data } = await api.post("/vaults/withdraw-cash", { ...body, shopId });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
