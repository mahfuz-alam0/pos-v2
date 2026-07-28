import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeCustomerGroup(id: string | number) {
  try {
    const { data } = await api.delete("/customer-groups/delete", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
