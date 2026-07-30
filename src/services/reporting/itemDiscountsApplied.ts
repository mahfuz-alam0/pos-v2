import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchItemDiscountsApplied(params: Record<string, any>) {
  try {
    const { data } = await api.get("/reporting/get-item-discounts-applied", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
