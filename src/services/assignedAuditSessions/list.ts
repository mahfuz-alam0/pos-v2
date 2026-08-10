import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchAssignedAuditSessionsList(
  shopId: string | number,
  params: { limit?: number; page?: number; assignedToId?: string; storageLocationId?: string } = {},
) {
  try {
    const { data } = await api.get("/assigned-audit-sessions/list", { params: { shopId, ...params } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
