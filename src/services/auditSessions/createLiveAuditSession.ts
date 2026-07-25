import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createLiveAuditSession(body: {
  shopId: string | number;
  packageIds: (string | number)[];
  storageLocationId?: string | number;
}) {
  try {
    const { data } = await api.post("/audit-sessions/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
