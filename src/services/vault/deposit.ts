import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function depositToVault(shopId: string, body: { amount: number; reason?: string }) {
  try {
    const { data } = await api.post("/vaults/deposit-cash", { ...body, shopId });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
