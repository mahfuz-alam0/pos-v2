import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function depositToVaultFromDrawer(
  shopId: string,
  body: { drawerId: string; amount: number; reason?: string }
) {
  try {
    const { data } = await api.post("/vaults/deposit-cash-from-drawer", { ...body, shopId });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
