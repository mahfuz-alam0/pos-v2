import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchInventoryCleanupConfig(shopId: string) {
  try {
    const { data } = await api.get("/inventory-cleanup/config", { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function updateInventoryCleanupConfig(body: Record<string, any>) {
  try {
    const { data } = await api.put("/inventory-cleanup/config", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function ignoreInventoryCleanupPackages(body: Record<string, any>) {
  try {
    const { data } = await api.put("/inventory-cleanup/config/ignored-packages", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
