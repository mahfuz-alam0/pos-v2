import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchCustomerGroups(params = { limit: 30, page: 1 }) {
  try {
    const { data } = await api.get("/customer-groups/list-all-customer-groups", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
