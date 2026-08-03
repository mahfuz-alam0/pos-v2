import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchEodSalesSummary(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/get-eod-sales-summary", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
