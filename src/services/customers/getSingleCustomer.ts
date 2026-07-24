import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSingleCustomer(id) {
  try {
    const response = await api.get(`/customers/single-customer`, {
      params: { id },
    });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
