import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function bulkUpdateInventoryProps(body: Record<string, any>) {
  try {
    const { data } = await api.put("/inventories/bulk-update-props", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
