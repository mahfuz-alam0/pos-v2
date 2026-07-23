import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSalesByEmployee(params) {
  try {
    const { data } = await api.get("/reporting/get-sales-by-employee", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
