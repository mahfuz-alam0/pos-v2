import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchLeaflyConfig(shopId) {
  try {
    const { data } = await api.get("/leafly/config", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
