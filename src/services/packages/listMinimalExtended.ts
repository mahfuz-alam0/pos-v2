import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Extended minimal package list used by the inventory audit page — includes
// storageLocationBreakdown (per-location qty) and metrQuantity, which the
// plain list-packages-minimal endpoint (services/packages/list.ts) does not.
export async function fetchPackagesMinimalExtended(shopId: string | number, params: Record<string, any> = {}) {
  try {
    const { data } = await api.get("/platform-packages/list-packages-minimal-extended", {
      params: { shopId, ...params },
    });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
