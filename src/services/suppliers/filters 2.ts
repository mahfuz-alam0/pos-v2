import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSupplierFilters() {
  try {
    const { data } = await api.get("/suppliers/filter-representations");
    return { data: data.data?.filters ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
