import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchHourOfDaySales(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/get-hour-sales", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
