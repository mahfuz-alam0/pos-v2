import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function listCustomerTypes() {
  try {
    const response = await api.get(`/customer-types/list-all-customer-types`);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
