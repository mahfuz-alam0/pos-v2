import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteCustomer(customerId) {
  try {
    const response = await api.delete(`/customers/delete`, { params: { id: customerId } });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
