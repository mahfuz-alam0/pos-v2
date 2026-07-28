import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSingleDrawer(id) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(
      `/transactions/drawers/single?id=${id}&shopId=${shopId}`
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
