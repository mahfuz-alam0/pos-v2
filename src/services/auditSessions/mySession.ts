import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMyLiveAuditSession(shopId: string | number) {
  try {
    const { data } = await api.get("/audit-sessions/my-session", { params: { shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
