import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createPrintTemplate(body: unknown) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.post("/print-templates/create", { ...(body as object), shopId });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
