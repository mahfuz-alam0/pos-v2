import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchLabels() {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.get("/printable-models/list", { params: { shopId } });
    return { data: data.data?.models ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
