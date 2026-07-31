import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createCustomerType(body: { name: string; description: string }) {
  try {
    const { data } = await api.post("/customer-types/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
