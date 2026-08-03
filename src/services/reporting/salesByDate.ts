import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSalesByDate(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/get-sales-by-date", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
