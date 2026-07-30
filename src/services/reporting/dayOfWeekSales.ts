import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchDayOfWeekSales(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/get-day-time-sales", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
