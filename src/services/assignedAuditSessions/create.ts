import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Creates a *pending* audit session (not yet started) — used when "Start the
// session right away" is unchecked in Add Live Session. A separate resource
// from /audit-sessions/create, converted to a real live session via
// /assigned-audit-sessions/start once someone clicks "Start Now".
export async function createAssignedAuditSession(body: {
  shopId: string | number;
  assignedToId: string;
  storageLocationId: string;
  isBlindCount: boolean;
  countMethod: "SCAN" | "MANUAL" | "EITHER";
  notes?: string | null;
  shouldCreateTask: boolean;
  dueDateString?: string | null;
  dueDateTwelveHours?: string | null;
}) {
  try {
    const { data } = await api.post("/assigned-audit-sessions/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
