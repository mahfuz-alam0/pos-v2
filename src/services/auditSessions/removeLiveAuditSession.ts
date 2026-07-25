import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeLiveAuditSession(id: string | number, shopId: string | number) {
  try {
    const { data } = await api.delete("/audit-sessions/delete", { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
