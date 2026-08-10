import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Confirmed against the OpenAPI spec — this endpoint has no concept of
// assignedToId or a task; it just starts a live session for whoever's
// calling it. Use assignedAuditSessions/create for the "assign for later" flow.
export async function createLiveAuditSession(body: {
  shopId: string | number;
  storageLocationId: string | number;
  packageIds?: (string | number)[];
  isBlindCount?: boolean;
  countMethod?: "SCAN" | "MANUAL" | "EITHER";
}) {
  try {
    const { data } = await api.post("/audit-sessions/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
