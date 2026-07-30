import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSalesHoursStats(params: Record<string, any>) {
  try {
    const { data } = await api.get("/analytics/sales-hours/sales-hours-between-times", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
