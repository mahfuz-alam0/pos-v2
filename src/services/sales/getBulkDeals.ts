import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getBulkDeals(body) {
  try {
    const response = await api.post(
      "/deals/list-all-applicable-regular-deals-for-bulk-items",
      body
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
