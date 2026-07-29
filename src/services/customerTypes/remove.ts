import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeCustomerType(id: string | number) {
  try {
    const { data } = await api.delete("/customer-types/delete", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
