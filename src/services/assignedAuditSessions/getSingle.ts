import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleAssignedAuditSession(shopId: string | number, id: string) {
  try {
    const { data } = await api.get("/assigned-audit-sessions/single", { params: { shopId, id } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
