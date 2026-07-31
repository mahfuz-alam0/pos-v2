import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function forceMarkSaleAsPaid(id: string | number, shopId: string | number) {
  try {
    const { data } = await api.put("/sales/force-mark-as-paid", { shopId, id });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
