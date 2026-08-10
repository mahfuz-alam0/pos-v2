import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeAssignedAuditSession(id: string, shopId: string | number) {
  try {
    const { data } = await api.delete("/assigned-audit-sessions/delete", { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
