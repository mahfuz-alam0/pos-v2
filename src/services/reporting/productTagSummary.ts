import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchProductTagSummary(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/product-tag-summary", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
