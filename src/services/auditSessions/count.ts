import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Live audit-session count for the shop (raw `audit-sessions/count`,
// distinct from the committed-audit-sessions history in list.ts / getSingle.ts).
export async function fetchLiveAuditSessionCount(shopId: string | number) {
  try {
    const { data } = await api.get("/audit-sessions/count", { params: { shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
