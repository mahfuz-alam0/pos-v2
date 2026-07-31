import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getAutoPrintPreference(shopId: string, registerId: string) {
  try {
    const { data } = await api.get("/sales-receipt-print-preference/get-preference", { params: { shopId, registerId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function setAutoPrintPreference(shopId: string, registerId: string, isAutomatedSalesReceiptEnabled: boolean) {
  try {
    const { data } = await api.post("/sales-receipt-print-preference/set-preference", {
      shopId,
      registerId,
      isAutomatedSalesReceiptEnabled,
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
