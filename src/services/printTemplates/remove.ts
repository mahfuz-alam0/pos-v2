import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removePrintTemplate(id: string | number) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.delete("/print-templates/remove", { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
