import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getWeedmapsMenuItems() {
  const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
  try {
    const { data } = await api.get("/weedmaps/weedmap-menu-items", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
