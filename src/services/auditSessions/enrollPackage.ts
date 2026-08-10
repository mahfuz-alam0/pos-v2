import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Adds a package to an in-progress live audit session — used when a scan on
// the live count session page doesn't match any already-enrolled package.
export async function enrollAuditSessionPackage(body: {
  shopId: string | number;
  id: string;
  packageId: string;
}) {
  try {
    const { data } = await api.put("/audit-sessions/enroll-package", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
