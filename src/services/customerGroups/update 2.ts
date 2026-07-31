import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateCustomerGroup(id: string | number, body: { name: string; description: string }) {
  try {
    const { data } = await api.put("/customer-groups/update", body, { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
