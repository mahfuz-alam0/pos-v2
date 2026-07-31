import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateDrawerTransaction(body: {
  id: string;
  drawerId: string;
  sessionId: string;
  notes?: string;
  cashCredit?: number;
  cashDebit?: number;
  virtualCredit?: number;
  virtualDebit?: number;
  shopId: string;
}) {
  try {
    const { data } = await api.put("/transactions/drawers/update-transaction", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
