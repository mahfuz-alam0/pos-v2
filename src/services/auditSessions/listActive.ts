import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Active/in-progress live audit sessions for the shop (raw `audit-sessions/list`).
// Not to be confused with fetchAuditSessions in list.ts, which lists
// *committed* (finished) audit session history.
export async function fetchActiveAuditSessions(shopId: string | number) {
  try {
    const { data } = await api.get("/audit-sessions/list", { params: { shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
