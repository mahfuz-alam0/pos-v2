import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function mergeCustomers(payload: {
  customerIdsToMerge: string[];
  newProperties: Record<string, any>;
}) {
  try {
    const response = await api.post(`/customers/merge-customers`, payload);
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
