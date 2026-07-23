import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchPendingPreSales(shopId) {
  try {
    const { data } = await api.get("/pre-sales/list-all-pending-pre-sales", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
