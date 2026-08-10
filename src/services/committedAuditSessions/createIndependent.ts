import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// "Regular Audit (Scan only)" — submits scanned package counts directly,
// with no live count session involved. Ported from the old app's
// handleSubmitScanOnlyAudit (committed-audit-sessions/create-independent).
export async function createIndependentCommittedAuditSession(body: {
  shopId: string | number;
  storageLocationId: string;
  startedAtISO: string;
  packagesCountData: { packageId: string; finalQty: number; startingCount: number }[];
}) {
  try {
    const { data } = await api.post("/committed-audit-sessions/create-independent", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
