import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function confirmPreSale(body) {
  try {
    const { data } = await api.put("/pre-sales/confirm-pre-sale", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
