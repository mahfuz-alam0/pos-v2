import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createCustomerGroup(body: { name: string; description: string }) {
  try {
    const { data } = await api.post("/customer-groups/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
