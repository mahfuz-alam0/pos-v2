import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Fetches full package rows for a known set of ids — used by the Inventory
// Cleanup drawer to show the staged packages (old app: PUT
// platform-packages/populate-packages-with-body-request).
export async function populatePackagesWithIds(shopId: string, packageIds: string[]) {
  try {
    const { data } = await api.put(
      "/platform-packages/populate-packages-with-body-request",
      { includePackageIds: packageIds },
      { params: { shopId, limit: packageIds.length || 1, isFinished: false } }
    );
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
