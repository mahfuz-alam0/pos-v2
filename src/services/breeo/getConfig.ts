import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getBreeoConfig() {
  const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
  try {
    const { data } = await api.get("/breeo/get-config", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
