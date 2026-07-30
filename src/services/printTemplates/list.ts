import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchPrintTemplates(templateType?: string) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const params: Record<string, any> = { shopId };
    if (templateType) params.templateType = templateType;
    const { data } = await api.get("/print-templates/list", { params });
    return { data: data.data?.templates ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
