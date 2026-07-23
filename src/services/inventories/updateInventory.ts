import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateInventory(body) {
  try {
    const { data } = await api.put("/inventories/update-info", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
