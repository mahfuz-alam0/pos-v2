import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchTaxSummary(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/get-tax-summary", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
