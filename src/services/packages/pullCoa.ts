import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function pullPackageCoa(id: string, shopId: string) {
  try {
    // The controller binds these with @Body() (WithShopIdAndIdDto), not @Query()
    // — sending them as query params leaves both undefined and fails validation.
    const { data } = await api.put("/metrc-packages/populate-lab-results", { id, shopId });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
