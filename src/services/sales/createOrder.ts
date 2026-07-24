import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createOrder(body) {
  try {
    const response = await api.post("/sales/create-internal-sale", body);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
