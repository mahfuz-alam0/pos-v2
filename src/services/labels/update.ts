import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateLabel(body: unknown) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.post("/printable-models/update", { ...(body as object), shopId });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
