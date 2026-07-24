import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getCustomerFilters() {
  try {
    const response = await api.get(`/customers/filter-representations`);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
