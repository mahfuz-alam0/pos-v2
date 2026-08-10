import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Converts a pending assigned session into a real, active live audit session.
// No body — reference the assigned session by id (or, alternatively, by its
// linked task's id if it was created with shouldCreateTask).
export async function startAssignedAuditSession(
  shopId: string | number,
  by: { sessionId: string } | { taskId: string },
) {
  try {
    const { data } = await api.put(
      "/assigned-audit-sessions/start",
      {},
      { params: { shopId, ...by } },
    );
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
