import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function cancelPreSale(body) {
  try {
    const { data } = await api.put("/pre-sales/cancel-pre-sale", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
