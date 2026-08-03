import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Summary for a single live audit session (packagesData, countKV, etc.) —
// backs the /inventory-management/audit/[id] live count session page.
export async function fetchLiveAuditSessionSummary(shopId: string | number, auditSessionId: string) {
  try {
    const { data } = await api.get("/audit-sessions/get-summary", {
      params: { shopId, auditSessionId },
    });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
