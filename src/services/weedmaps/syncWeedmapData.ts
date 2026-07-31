import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function syncWeedmapData() {
  const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
  try {
    const { data } = await api.get("/weedmaps/sync-weedmap-data", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
