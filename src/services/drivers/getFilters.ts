import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchDriverFilters() {
  try {
    const { data } = await api.get("/drivers/filter-representations");
    return { data: data.data?.filters ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
