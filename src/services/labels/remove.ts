import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeLabel(id: string | number) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.delete("/printable-models/remove", { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
