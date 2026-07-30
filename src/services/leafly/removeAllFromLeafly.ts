import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeAllFromLeafly() {
  const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
  try {
    const { data } = await api.delete("/leafly/menu", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
