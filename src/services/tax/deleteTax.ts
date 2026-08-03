import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteTax(id: string | number) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.delete(`/tax-profiles/remove?id=${id}&shopId=${shopId}`);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
