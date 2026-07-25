import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchWeedmapsConfig(shopId) {
  try {
    const { data } = await api.get("/weedmaps/get-config", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
