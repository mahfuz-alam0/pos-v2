import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateTax(id: string | number, body: unknown) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.put(`/tax-profiles/update?id=${id}`, { ...(body as object), shopId });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
