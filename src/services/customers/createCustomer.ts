import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createCustomer(body) {
  try {
    const response = await api.post(`/customers/create`, body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
