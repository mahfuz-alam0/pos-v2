import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchPackageIdsBeingCounted(shopId: string | number) {
  try {
    const { data } = await api.get("/audit-sessions/list-package-ids-being-counted", {
      params: { shopId },
    });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
