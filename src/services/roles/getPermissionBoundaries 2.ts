import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getPermissionBoundaries() {
  try {
    const { data } = await api.get("/roles/permission-boundaries-for-access-controlled");
    return { data: data?.data?.permissionBoundaryDataSet ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
