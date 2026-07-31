import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchLegacyPermissionsTree(orgId: string) {
  try {
    const { data } = await api.get("/feature-permissions/all-available-feature-permission-tree-against-organization", {
      params: { orgId },
    });
    return { data: data?.data?.featurePermissions ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
