import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateCustomerInfo(customerId, body) {
  try {
    const response = await api.put(`/customers/update?id=${customerId}`, body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
