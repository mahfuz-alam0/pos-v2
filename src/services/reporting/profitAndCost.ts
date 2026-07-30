import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchProfitAndCost(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/profit-and-cost", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
