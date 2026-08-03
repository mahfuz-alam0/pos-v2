import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSalesStatusAndAOVOverTime(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/get-sales-status-and-aov-over-time", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
