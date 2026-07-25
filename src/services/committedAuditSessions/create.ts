import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Commits a finished live count session's final counted quantities.
export async function createCommittedAuditSession(body: {
  shopId: string | number;
  auditSessionId: string;
  packagesCountData: { packageId: string; finalQty: number }[];
}) {
  try {
    const { data } = await api.post("/committed-audit-sessions/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
