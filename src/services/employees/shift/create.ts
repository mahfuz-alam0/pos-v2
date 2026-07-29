import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createShift(body: Record<string, unknown>) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.post("/work-shifts/create-shift", { shopId, ...body });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
