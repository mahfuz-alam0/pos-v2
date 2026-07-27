import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function decideLeaflyPreSale(body) {
  try {
    const { data } = await api.put("/pre-sales/leafly/decide-pre-sale", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
