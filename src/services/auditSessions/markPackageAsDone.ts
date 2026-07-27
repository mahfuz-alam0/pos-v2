import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function markAuditSessionPackageAsDone(body: {
  shopId: string | number;
  id: string;
  packageId: string;
  value: boolean;
}) {
  try {
    const { data } = await api.put("/audit-sessions/mark-as-done", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
