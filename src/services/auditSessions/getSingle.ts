import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchAuditSession(id, shopId) {
  try {
    const { data } = await api.get("/committed-audit-sessions/single", { params: { id, shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
