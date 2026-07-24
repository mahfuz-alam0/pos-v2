import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function setAuditSessionPackageReview(body) {
  try {
    const { data } = await api.put("/committed-audit-sessions/set-package-review", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
